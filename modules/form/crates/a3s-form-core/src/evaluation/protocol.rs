use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    canonicalize_json_with_limit, CanonicalError, CanonicalValue, ABSOLUTE_MAX_REQUEST_BYTES,
    ABSOLUTE_MAX_RESPONSE_BYTES, COMPILER_REVISION, FORM_SCHEMA_PROFILE_1,
};

use super::{ComputedRuleTraceEntry, FieldError, FormValueEvaluation};

pub const EVALUATE_REQUEST_API_VERSION: &str = "a3s.dev/form-core/evaluate-request/v1alpha1";
pub const EVALUATE_RESPONSE_API_VERSION: &str = "a3s.dev/form-core/evaluate-response/v1alpha1";
pub const FORM_LOCALE_CATALOG_API_VERSION: &str = "a3s.dev/form-locale-catalog/v1";

const FORM_PLAN_API_VERSION: &str = "a3s.dev/form-plan/v1alpha1";
const ABSOLUTE_MAX_EXPRESSION_OPERATIONS: u64 = 16_384;
const MAX_LOCALE_BYTES: usize = 256;
const MAX_LOCALE_MESSAGES: usize = 256;
const MAX_LOCALE_MESSAGE_BYTES: usize = 8 * 1024;

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationOptions {
    #[serde(default, skip_serializing_if = "is_false")]
    pub include_values: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale_catalog: Option<EvaluationLocaleCatalogOverride>,
}

const fn is_false(value: &bool) -> bool {
    !*value
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationLocaleCatalogOverride {
    pub api_version: String,
    pub messages: CanonicalValue,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluateRequest {
    pub api_version: String,
    pub form_plan: CanonicalValue,
    pub value: CanonicalValue,
    #[serde(default, skip_serializing_if = "EvaluationOptions::is_empty")]
    pub options: EvaluationOptions,
}

impl EvaluationOptions {
    fn is_empty(&self) -> bool {
        self == &Self::default()
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluateResponse {
    pub api_version: &'static str,
    pub compiler_revision: &'static str,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<CanonicalValue>,
    pub trace: Vec<ComputedRuleTraceEntry>,
    pub errors: Vec<FieldError>,
}

impl EvaluateResponse {
    #[must_use]
    pub fn evaluated(evaluation: FormValueEvaluation) -> Self {
        Self {
            api_version: EVALUATE_RESPONSE_API_VERSION,
            compiler_revision: COMPILER_REVISION,
            ok: evaluation.errors.is_empty(),
            value: Some(evaluation.value),
            trace: evaluation.trace,
            errors: evaluation.errors,
        }
    }

    #[must_use]
    pub fn failure(error: &EvaluationProtocolError) -> Self {
        Self {
            api_version: EVALUATE_RESPONSE_API_VERSION,
            compiler_revision: COMPILER_REVISION,
            ok: false,
            value: None,
            trace: Vec::new(),
            errors: vec![error.field_error()],
        }
    }
}

#[derive(Debug, Error)]
pub enum EvaluationProtocolError {
    #[error("evaluation request is {actual} bytes; the hard limit is {limit} bytes")]
    RequestTooLarge { actual: usize, limit: usize },
    #[error("evaluation request is not valid JSON at line {line}, column {column}")]
    InvalidJson { line: usize, column: usize },
    #[error("unsupported evaluation request API version {actual:?}")]
    UnsupportedApiVersion { actual: String },
    #[error("form plan must be an object")]
    PlanMustBeObject,
    #[error("form plan API version is unsupported")]
    PlanApiVersion,
    #[error("form plan schema profile is unsupported")]
    PlanSchemaProfile,
    #[error("form plan field {field} is invalid")]
    InvalidPlanField { field: &'static str },
    #[error("form value must be a JSON object")]
    ValueMustBeObject,
    #[error("evaluation locale is invalid")]
    InvalidLocale,
    #[error("evaluation locale catalog is invalid")]
    InvalidLocaleCatalog,
    #[error("failed to encode evaluation response: {0}")]
    ResponseEncoding(String),
}

impl EvaluationProtocolError {
    #[must_use]
    pub fn field_error(&self) -> FieldError {
        let (code, path) = match self {
            Self::RequestTooLarge { .. } => ("protocol.request_size", ""),
            Self::InvalidJson { .. } => ("protocol.invalid_json", ""),
            Self::UnsupportedApiVersion { .. } => ("protocol.api_version", "/apiVersion"),
            Self::PlanMustBeObject => ("protocol.form_plan", "/formPlan"),
            Self::PlanApiVersion => ("protocol.form_plan_api_version", "/formPlan/apiVersion"),
            Self::PlanSchemaProfile => (
                "protocol.form_plan_schema_profile",
                "/formPlan/schemaProfile",
            ),
            Self::InvalidPlanField { field } => {
                return FieldError::new(
                    "protocol.form_plan",
                    self.to_string(),
                    format!("/formPlan/{field}"),
                );
            }
            Self::ValueMustBeObject => ("protocol.value", "/value"),
            Self::InvalidLocale => ("protocol.locale", "/options/locale"),
            Self::InvalidLocaleCatalog => ("protocol.locale_catalog", "/options/localeCatalog"),
            Self::ResponseEncoding(_) => ("protocol.response_encoding", ""),
        };
        FieldError::new(code, self.to_string(), path)
    }
}

/// Decodes and validates one bounded native/WASM evaluation request.
pub fn decode_evaluate_request(input: &[u8]) -> Result<EvaluateRequest, EvaluationProtocolError> {
    if input.len() > ABSOLUTE_MAX_REQUEST_BYTES {
        return Err(EvaluationProtocolError::RequestTooLarge {
            actual: input.len(),
            limit: ABSOLUTE_MAX_REQUEST_BYTES,
        });
    }
    let request = serde_json::from_slice::<EvaluateRequest>(input).map_err(|error| {
        EvaluationProtocolError::InvalidJson {
            line: error.line(),
            column: error.column(),
        }
    })?;
    if request.api_version != EVALUATE_REQUEST_API_VERSION {
        return Err(EvaluationProtocolError::UnsupportedApiVersion {
            actual: request.api_version,
        });
    }
    validate_evaluation_inputs(&request.form_plan, &request.value, &request.options)?;
    Ok(request)
}

pub(super) fn validate_evaluation_inputs(
    plan: &CanonicalValue,
    value: &CanonicalValue,
    options: &EvaluationOptions,
) -> Result<(), EvaluationProtocolError> {
    if plan.as_object().is_none() {
        return Err(EvaluationProtocolError::PlanMustBeObject);
    }
    if plan.get("apiVersion").and_then(CanonicalValue::as_str) != Some(FORM_PLAN_API_VERSION) {
        return Err(EvaluationProtocolError::PlanApiVersion);
    }
    if plan.get("schemaProfile").and_then(CanonicalValue::as_str) != Some(FORM_SCHEMA_PROFILE_1) {
        return Err(EvaluationProtocolError::PlanSchemaProfile);
    }
    require_object(plan, "metadata")?;
    require_object(plan, "schema")?;
    require_array(plan, "nodes")?;
    require_object(plan, "nodeById")?;
    require_array(plan, "rules")?;
    require_array(plan, "dependencyOrder")?;
    let expression_limit = plan
        .get("expressionOperationLimit")
        .and_then(CanonicalValue::as_f64)
        .filter(|limit| {
            limit.fract() == 0.0
                && *limit > 0.0
                && *limit <= ABSOLUTE_MAX_EXPRESSION_OPERATIONS as f64
        })
        .ok_or(EvaluationProtocolError::InvalidPlanField {
            field: "expressionOperationLimit",
        })?;
    let _ = expression_limit;
    if plan
        .get("dependencyOrder")
        .and_then(CanonicalValue::as_array)
        .is_some_and(|values| values.iter().any(|value| value.as_str().is_none()))
    {
        return Err(EvaluationProtocolError::InvalidPlanField {
            field: "dependencyOrder",
        });
    }
    if plan.get("ruleDependencies").is_some_and(|dependencies| {
        dependencies.as_object().is_none_or(|entries| {
            entries.iter().any(|(_, paths)| {
                paths
                    .as_array()
                    .is_none_or(|paths| paths.iter().any(|path| path.as_str().is_none()))
            })
        })
    }) {
        return Err(EvaluationProtocolError::InvalidPlanField {
            field: "ruleDependencies",
        });
    }
    if value.as_object().is_none() {
        return Err(EvaluationProtocolError::ValueMustBeObject);
    }
    if options
        .locale
        .as_ref()
        .is_some_and(|locale| locale.is_empty() || locale.len() > MAX_LOCALE_BYTES)
    {
        return Err(EvaluationProtocolError::InvalidLocale);
    }
    if let Some(catalog) = &options.locale_catalog {
        if catalog.api_version != FORM_LOCALE_CATALOG_API_VERSION {
            return Err(EvaluationProtocolError::InvalidLocaleCatalog);
        }
        let valid_messages = catalog.messages.as_object().is_some_and(|messages| {
            messages.len() <= MAX_LOCALE_MESSAGES
                && messages.iter().all(|(key, value)| {
                    !key.is_empty()
                        && key.len() <= MAX_LOCALE_BYTES
                        && value
                            .as_str()
                            .is_some_and(|message| message.len() <= MAX_LOCALE_MESSAGE_BYTES)
                })
        });
        if !valid_messages {
            return Err(EvaluationProtocolError::InvalidLocaleCatalog);
        }
    }
    Ok(())
}

fn require_object(
    plan: &CanonicalValue,
    field: &'static str,
) -> Result<(), EvaluationProtocolError> {
    if plan
        .get(field)
        .and_then(CanonicalValue::as_object)
        .is_some()
    {
        Ok(())
    } else {
        Err(EvaluationProtocolError::InvalidPlanField { field })
    }
}

fn require_array(
    plan: &CanonicalValue,
    field: &'static str,
) -> Result<(), EvaluationProtocolError> {
    if plan.get(field).and_then(CanonicalValue::as_array).is_some() {
        Ok(())
    } else {
        Err(EvaluationProtocolError::InvalidPlanField { field })
    }
}

/// Encodes one evaluation response as canonical UTF-8 JSON bytes.
pub fn encode_evaluate_response(
    response: &EvaluateResponse,
) -> Result<Vec<u8>, EvaluationProtocolError> {
    let serialized = serde_json::to_vec(response)
        .map_err(|error| EvaluationProtocolError::ResponseEncoding(error.to_string()))?;
    canonicalize_json_with_limit(&serialized, ABSOLUTE_MAX_RESPONSE_BYTES)
        .map_err(canonical_protocol_error)
}

fn canonical_protocol_error(error: CanonicalError) -> EvaluationProtocolError {
    EvaluationProtocolError::ResponseEncoding(error.to_string())
}
