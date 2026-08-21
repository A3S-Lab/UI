mod expression;
mod locale;
mod path;
mod protocol;
mod schema;
mod wizard;

use std::collections::{HashMap, HashSet};

use serde::Serialize;

use crate::{analyze_expression, CanonicalValue};

use expression::{evaluate_expression, optional_values_equal};
use locale::ValidationMessages;
use path::{
    expand_value_path_template, get_at_path, match_value_path_template, remove_at_path,
    resolve_value_path_template, set_at_path,
};
use schema::validate_schema;
use wizard::filter_inactive_wizard_page_errors;

pub use protocol::{
    decode_evaluate_request, encode_evaluate_response, EvaluateRequest, EvaluateResponse,
    EvaluationLocaleCatalogOverride, EvaluationOptions, EvaluationProtocolError,
    EVALUATE_REQUEST_API_VERSION, EVALUATE_RESPONSE_API_VERSION, FORM_LOCALE_CATALOG_API_VERSION,
};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldError {
    pub path: String,
    pub code: String,
    pub message: String,
}

impl FieldError {
    #[must_use]
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        path: impl Into<String>,
    ) -> Self {
        Self {
            path: path.into(),
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ComputedRuleTraceStatus {
    Set,
    Removed,
    Unchanged,
    Error,
    Skipped,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputedRuleTraceEntry {
    pub rule_id: String,
    pub target: String,
    pub path: String,
    pub dependencies: Vec<String>,
    pub status: ComputedRuleTraceStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_value: Option<CanonicalValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_value: Option<CanonicalValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct FormValueEvaluation {
    pub value: CanonicalValue,
    pub trace: Vec<ComputedRuleTraceEntry>,
    pub errors: Vec<FieldError>,
}

struct RuleInvocation {
    target_path: String,
    row_indices: Vec<usize>,
    dependencies: Vec<String>,
}

/// Evaluates one compiled Form plan and submitted JSON object through the
/// native semantic authority.
pub fn evaluate_form_value(
    form_plan: &CanonicalValue,
    value: &CanonicalValue,
    options: &EvaluationOptions,
) -> Result<FormValueEvaluation, EvaluationProtocolError> {
    protocol::validate_evaluation_inputs(form_plan, value, options)?;
    Ok(evaluate_validated(form_plan, value, options))
}

/// Evaluates one versioned request into a canonical response envelope.
/// Protocol failures are encoded so native and WASM callers fail identically.
pub fn evaluate_bytes(input: &[u8]) -> Result<Vec<u8>, EvaluationProtocolError> {
    let response = match decode_evaluate_request(input) {
        Ok(request) => EvaluateResponse::evaluated(evaluate_validated(
            &request.form_plan,
            &request.value,
            &request.options,
        )),
        Err(error) => EvaluateResponse::failure(&error),
    };
    match encode_evaluate_response(&response) {
        Ok(response) => Ok(response),
        Err(error) => encode_evaluate_response(&EvaluateResponse::failure(&error)),
    }
}

fn evaluate_validated(
    plan: &CanonicalValue,
    value: &CanonicalValue,
    options: &EvaluationOptions,
) -> FormValueEvaluation {
    let (computed_value, trace, mut errors) = run_computed_rules(plan, value, options);
    let locale = options
        .locale
        .as_deref()
        .or_else(|| {
            plan.get("metadata")
                .and_then(|metadata| metadata.get("locale"))
                .and_then(CanonicalValue::as_str)
        })
        .unwrap_or("zh-CN");
    let messages = ValidationMessages::resolve(locale, options.locale_catalog.as_ref());
    if let Some(schema) = plan.get("schema") {
        validate_schema(schema, Some(&computed_value), "", &mut errors, &messages);
    }
    run_validation_rules(plan, &computed_value, &messages, &mut errors);
    let errors = filter_inactive_wizard_page_errors(plan, &computed_value, errors);
    FormValueEvaluation {
        value: computed_value,
        trace,
        errors,
    }
}

fn run_computed_rules(
    plan: &CanonicalValue,
    value: &CanonicalValue,
    options: &EvaluationOptions,
) -> (CanonicalValue, Vec<ComputedRuleTraceEntry>, Vec<FieldError>) {
    let rules = plan
        .get("rules")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default();
    let mut computed_by_target = HashMap::new();
    for rule in rules
        .iter()
        .filter(|rule| rule.get("kind").and_then(CanonicalValue::as_str) == Some("computed"))
    {
        if let Some(target) = rule.get("target").and_then(CanonicalValue::as_str) {
            computed_by_target.insert(target, rule);
        }
    }
    let mut current = value.clone();
    let mut trace = Vec::new();
    let mut errors = Vec::new();
    let mut failed_targets = HashSet::new();
    for target in plan
        .get("dependencyOrder")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .filter_map(CanonicalValue::as_str)
    {
        let Some(rule) = computed_by_target.get(target).copied() else {
            continue;
        };
        for invocation in rule_invocations(plan, rule, &current) {
            let path = invocation.target_path;
            let previous = get_at_path(&current, &path).cloned();
            if invocation
                .dependencies
                .iter()
                .any(|dependency| failed_targets.contains(dependency))
            {
                current = remove_at_path(&current, &path);
                failed_targets.insert(path.clone());
                let rule_id = rule_id(rule);
                let message =
                    format!("Computed rule {rule_id} was skipped because a dependency failed.");
                errors.push(FieldError::new(
                    format!("rule.{rule_id}.dependency"),
                    message.clone(),
                    path.clone(),
                ));
                trace.push(trace_entry(
                    rule,
                    path,
                    invocation.dependencies,
                    ComputedRuleTraceStatus::Skipped,
                    previous,
                    None,
                    Some(message),
                    options.include_values,
                ));
                continue;
            }
            let expression = rule.get("expression");
            let result = expression
                .ok_or_else(|| {
                    "TypeError: Expression must be an object with a supported operator.".to_owned()
                })
                .and_then(|expression| {
                    evaluate_expression(
                        expression,
                        &current,
                        expression_operation_limit(plan),
                        (rule.get("scope").and_then(CanonicalValue::as_str) == Some("row"))
                            .then_some(invocation.row_indices.as_slice()),
                    )
                });
            match result {
                Ok(next) => {
                    let unchanged = optional_values_equal(previous.as_ref(), next.as_ref());
                    let status = if unchanged {
                        ComputedRuleTraceStatus::Unchanged
                    } else if next.is_none() {
                        ComputedRuleTraceStatus::Removed
                    } else {
                        ComputedRuleTraceStatus::Set
                    };
                    if !unchanged {
                        current = match &next {
                            Some(next) => set_at_path(&current, &path, next.clone()),
                            None => remove_at_path(&current, &path),
                        };
                    }
                    trace.push(trace_entry(
                        rule,
                        path,
                        invocation.dependencies,
                        status,
                        previous,
                        next,
                        None,
                        options.include_values,
                    ));
                }
                Err(message) => {
                    current = remove_at_path(&current, &path);
                    failed_targets.insert(path.clone());
                    let rule_id = rule_id(rule);
                    errors.push(FieldError::new(
                        format!("rule.{rule_id}.evaluation"),
                        message.clone(),
                        path.clone(),
                    ));
                    trace.push(trace_entry(
                        rule,
                        path,
                        invocation.dependencies,
                        ComputedRuleTraceStatus::Error,
                        previous,
                        None,
                        Some(message),
                        options.include_values,
                    ));
                }
            }
        }
    }
    (current, trace, errors)
}

#[allow(clippy::too_many_arguments)]
fn trace_entry(
    rule: &CanonicalValue,
    path: String,
    dependencies: Vec<String>,
    status: ComputedRuleTraceStatus,
    previous_value: Option<CanonicalValue>,
    next_value: Option<CanonicalValue>,
    error: Option<String>,
    include_values: bool,
) -> ComputedRuleTraceEntry {
    ComputedRuleTraceEntry {
        rule_id: rule_id(rule).to_owned(),
        target: rule
            .get("target")
            .and_then(CanonicalValue::as_str)
            .unwrap_or_default()
            .to_owned(),
        path,
        dependencies,
        status,
        previous_value: include_values.then_some(previous_value).flatten(),
        next_value: include_values.then_some(next_value).flatten(),
        error,
    }
}

fn run_validation_rules(
    plan: &CanonicalValue,
    value: &CanonicalValue,
    messages: &ValidationMessages,
    errors: &mut Vec<FieldError>,
) {
    for rule in plan
        .get("rules")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .filter(|rule| rule.get("kind").and_then(CanonicalValue::as_str) == Some("validate"))
    {
        for invocation in rule_invocations(plan, rule, value) {
            let result = rule
                .get("expression")
                .ok_or_else(|| {
                    "TypeError: Expression must be an object with a supported operator.".to_owned()
                })
                .and_then(|expression| {
                    evaluate_expression(
                        expression,
                        value,
                        expression_operation_limit(plan),
                        (rule.get("scope").and_then(CanonicalValue::as_str) == Some("row"))
                            .then_some(invocation.row_indices.as_slice()),
                    )
                });
            let rule_id = rule_id(rule);
            match result {
                Err(message) => errors.push(FieldError::new(
                    format!("rule.{rule_id}.evaluation"),
                    message,
                    invocation.target_path,
                )),
                Ok(result) if !result.as_ref().is_some_and(truthy) => {
                    let message = rule
                        .get("message")
                        .and_then(CanonicalValue::as_str)
                        .unwrap_or(&messages.validation_rule);
                    errors.push(FieldError::new(
                        format!("rule.{rule_id}"),
                        message,
                        invocation.target_path,
                    ));
                }
                Ok(_) => {}
            }
        }
    }
}

fn rule_invocations(
    plan: &CanonicalValue,
    rule: &CanonicalValue,
    value: &CanonicalValue,
) -> Vec<RuleInvocation> {
    let target = rule
        .get("target")
        .and_then(CanonicalValue::as_str)
        .unwrap_or_default();
    let node = plan.get("nodeById").and_then(|nodes| nodes.get(target));
    let template = node
        .and_then(|node| {
            node.get("valuePathTemplate")
                .or_else(|| node.get("valuePath"))
        })
        .and_then(CanonicalValue::as_str);
    let dependencies = rule_dependency_paths(plan, rule);
    if rule.get("scope").and_then(CanonicalValue::as_str) != Some("row") {
        let target_path = node
            .and_then(|node| node.get("valuePath"))
            .and_then(CanonicalValue::as_str)
            .map(str::to_owned)
            .or_else(|| {
                template
                    .filter(|template| !template.contains('*'))
                    .map(str::to_owned)
            })
            .unwrap_or_else(|| target.to_owned());
        return (!target_path.is_empty())
            .then_some(RuleInvocation {
                target_path,
                row_indices: Vec::new(),
                dependencies,
            })
            .into_iter()
            .collect();
    }
    let Some(template) = template else {
        return Vec::new();
    };
    expand_value_path_template(value, template)
        .into_iter()
        .filter_map(|target_path| {
            let row_indices = match_value_path_template(template, &target_path)?;
            let dependencies = dependencies
                .iter()
                .map(|dependency| {
                    resolve_value_path_template(dependency, &row_indices)
                        .unwrap_or_else(|| dependency.clone())
                })
                .collect();
            Some(RuleInvocation {
                target_path,
                row_indices,
                dependencies,
            })
        })
        .collect()
}

fn rule_dependency_paths(plan: &CanonicalValue, rule: &CanonicalValue) -> Vec<String> {
    let rule_id = rule_id(rule);
    if let Some(paths) = plan
        .get("ruleDependencies")
        .and_then(|dependencies| dependencies.get(rule_id))
        .and_then(CanonicalValue::as_array)
    {
        return paths
            .iter()
            .filter_map(CanonicalValue::as_str)
            .map(str::to_owned)
            .collect();
    }
    let mut paths = rule
        .get("expression")
        .and_then(|expression| analyze_expression(expression).ok())
        .map(|analysis| analysis.field_paths)
        .unwrap_or_default();
    paths.sort_by(|left, right| left.encode_utf16().cmp(right.encode_utf16()));
    paths
}

fn rule_id(rule: &CanonicalValue) -> &str {
    rule.get("id")
        .and_then(CanonicalValue::as_str)
        .unwrap_or_default()
}

fn expression_operation_limit(plan: &CanonicalValue) -> u64 {
    plan.get("expressionOperationLimit")
        .and_then(CanonicalValue::as_f64)
        .unwrap_or(256.0) as u64
}

fn truthy(value: &CanonicalValue) -> bool {
    match value {
        CanonicalValue::Null | CanonicalValue::Bool(false) => false,
        CanonicalValue::Number(value) => *value != 0.0,
        CanonicalValue::String(value) => !value.is_empty(),
        CanonicalValue::Bool(true) | CanonicalValue::Array(_) | CanonicalValue::Object(_) => true,
    }
}
