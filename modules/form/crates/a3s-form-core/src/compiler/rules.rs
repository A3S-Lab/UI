use std::collections::{HashMap, HashSet};

use crate::{analyze_expression, CanonicalValue, CompilerLimits, Diagnostic};

use super::{
    error, error_with_hint, schema_has_value_path, sort_utf16, CompiledNode, RuleAnalysis,
};

pub(super) fn inspect_rules(
    document: &CanonicalValue,
    schema: &CanonicalValue,
    nodes: &[CompiledNode],
    node_indices: &HashMap<String, usize>,
    limits: CompilerLimits,
    diagnostics: &mut Vec<Diagnostic>,
) -> RuleAnalysis {
    let rules = document
        .get("rules")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default();
    if rules.len() as u64 > limits.max_rules {
        diagnostics.push(error(
            "limits.rules",
            format!(
                "Rule count exceeds the configured limit of {}.",
                limits.max_rules
            ),
            "/rules",
        ));
    }
    let mut ids = HashSet::new();
    let mut computed_targets = HashSet::new();
    let mut valid_rules = Vec::new();
    let mut dependencies = Vec::new();
    for (index, rule) in rules.iter().enumerate() {
        let path = format!("/rules/{index}");
        let id = rule.get("id").and_then(CanonicalValue::as_str);
        let target = rule.get("target").and_then(CanonicalValue::as_str);
        let expression = rule.get("expression");
        if rule.as_object().is_none()
            || id.is_none_or(|id| id.trim().is_empty())
            || target.is_none_or(|target| target.trim().is_empty())
            || expression.is_none_or(|expression| expression.as_object().is_none())
        {
            diagnostics.push(error(
                "rule.definition",
                "Rule definition is invalid.",
                path,
            ));
            continue;
        }
        let (Some(id), Some(target), Some(expression)) = (id, target, expression) else {
            continue;
        };
        if !ids.insert(id) {
            diagnostics.push(error(
                "rule.duplicate",
                format!("Rule ID {id} is duplicated."),
                format!("{path}/id"),
            ));
        }
        let kind = rule.get("kind").and_then(CanonicalValue::as_str);
        if !kind.is_some_and(|kind| ["visible", "enabled", "computed", "validate"].contains(&kind))
        {
            diagnostics.push(error(
                "rule.kind",
                format!("Rule {id} has an unsupported kind."),
                format!("{path}/kind"),
            ));
            continue;
        }
        if rule.get("scope").is_some_and(|scope| {
            !scope
                .as_str()
                .is_some_and(|scope| ["form", "row"].contains(&scope))
        }) {
            diagnostics.push(error(
                "rule.scope",
                format!("Rule {id} scope must be form or row."),
                format!("{path}/scope"),
            ));
        }
        let target_node = node_indices.get(target).map(|index| &nodes[*index]);
        if target_node.is_none() {
            diagnostics.push(error(
                "rule.target",
                format!("Rule target {target} does not exist."),
                format!("{path}/target"),
            ));
        }
        let target_path = target_node.and_then(|node| {
            node.value_path_template
                .as_ref()
                .or(node.value_path.as_ref())
        });
        if kind == Some("computed") {
            if target_path.is_none() {
                diagnostics.push(error(
                    "rules.computed_target",
                    format!("Computed rule {id} must target a value-bearing field or repeater."),
                    format!("{path}/target"),
                ));
            }
            if !computed_targets.insert(target) {
                diagnostics.push(error(
                    "rules.computed_target_duplicate",
                    format!("Only one computed rule may target {target}."),
                    format!("{path}/target"),
                ));
            }
        }
        if matches!(kind, Some("computed" | "validate"))
            && target_path.is_some_and(|target| target.contains('*'))
            && rule.get("scope").and_then(CanonicalValue::as_str) != Some("row")
        {
            diagnostics.push(error(
                "rule.dynamic_target",
                format!(
                    "Rule {id} cannot target a repeater item field without declaring row scope."
                ),
                format!("{path}/target"),
            ));
        }
        if rule.get("scope").and_then(CanonicalValue::as_str) == Some("row")
            && target_path.is_none_or(|target| !target.contains('*'))
        {
            diagnostics.push(error(
                "rule.row_scope_target",
                format!("Row-scoped rule {id} must target a field inside a repeater."),
                format!("{path}/target"),
            ));
        }
        match analyze_expression(expression) {
            Ok(analysis) => {
                inspect_rule_fields(
                    rule,
                    id,
                    target_path,
                    schema,
                    &analysis.field_paths,
                    &path,
                    diagnostics,
                );
                if analysis.size > limits.max_expression_operations {
                    diagnostics.push(error(
                        "limits.expression",
                        format!("Rule {id} exceeds the expression operation limit."),
                        format!("{path}/expression"),
                    ));
                }
                let mut field_paths = analysis.field_paths;
                sort_utf16(&mut field_paths);
                dependencies.push((id.to_owned(), field_paths));
                valid_rules.push(rule.clone());
            }
            Err(_) => diagnostics.push(error(
                "rule.expression",
                format!("Rule {id} expression is invalid."),
                format!("{path}/expression"),
            )),
        }
    }
    let dependency_order =
        computed_dependency_order(&valid_rules, nodes, node_indices, diagnostics);
    RuleAnalysis {
        dependencies,
        dependency_order,
    }
}

#[allow(clippy::too_many_arguments)]
fn inspect_rule_fields(
    rule: &CanonicalValue,
    id: &str,
    target_path: Option<&String>,
    schema: &CanonicalValue,
    field_paths: &[String],
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let row_scope = rule.get("scope").and_then(CanonicalValue::as_str) == Some("row");
    for field_path in field_paths {
        if !schema_has_value_path(schema, field_path) {
            diagnostics.push(error(
                "rule.field_reference",
                format!("Rule {id} references undeclared field {field_path}."),
                format!("{path}/expression"),
            ));
        } else if row_scope {
            if target_path
                .is_some_and(|target| !crate::is_value_path_scope_compatible(target, field_path))
            {
                diagnostics.push(error(
                    "rule.field_scope",
                    format!("Rule {id} cannot bind {field_path} from the target row scope."),
                    format!("{path}/expression"),
                ));
            }
        } else if field_path.contains('*') {
            diagnostics.push(error(
                "rule.field_scope",
                format!("Rule {id} must declare row scope before reading {field_path}."),
                format!("{path}/expression"),
            ));
        }
    }
}

fn computed_dependency_order(
    rules: &[CanonicalValue],
    nodes: &[CompiledNode],
    node_indices: &HashMap<String, usize>,
    diagnostics: &mut Vec<Diagnostic>,
) -> Vec<String> {
    let computed = rules
        .iter()
        .filter(|rule| rule.get("kind").and_then(CanonicalValue::as_str) == Some("computed"))
        .filter_map(|rule| {
            rule.get("target")
                .and_then(CanonicalValue::as_str)
                .map(|target| (target.to_owned(), rule))
        })
        .collect::<Vec<_>>();
    let target_by_path = computed
        .iter()
        .filter_map(|(target, _)| {
            let node = node_indices.get(target).map(|index| &nodes[*index])?;
            node.value_path_template
                .as_ref()
                .or(node.value_path.as_ref())
                .map(|path| (path.clone(), target.clone()))
        })
        .collect::<HashMap<_, _>>();
    let mut graph = HashMap::<String, Vec<String>>::new();
    for (target, rule) in &computed {
        let graph_dependencies = graph.entry(target.clone()).or_default();
        if let Some(expression) = rule.get("expression") {
            if let Ok(analysis) = analyze_expression(expression) {
                for field_path in analysis.field_paths {
                    if let Some(dependency) = target_by_path.get(&field_path) {
                        if !graph_dependencies.contains(dependency) {
                            graph_dependencies.push(dependency.clone());
                        }
                    }
                }
            }
        }
        sort_utf16(graph_dependencies);
    }

    let mut state = HashMap::<String, VisitState>::new();
    let mut stack = Vec::new();
    let mut order = Vec::new();
    let mut cycle = false;
    let mut targets = graph.keys().cloned().collect::<Vec<_>>();
    sort_utf16(&mut targets);
    for target in targets {
        visit_computed(
            &target,
            &graph,
            &mut state,
            &mut stack,
            &mut order,
            &mut cycle,
            diagnostics,
        );
    }
    if cycle {
        Vec::new()
    } else {
        order
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum VisitState {
    Visiting,
    Visited,
}

#[allow(clippy::too_many_arguments)]
fn visit_computed(
    id: &str,
    graph: &HashMap<String, Vec<String>>,
    state: &mut HashMap<String, VisitState>,
    stack: &mut Vec<String>,
    order: &mut Vec<String>,
    cycle: &mut bool,
    diagnostics: &mut Vec<Diagnostic>,
) {
    match state.get(id) {
        Some(VisitState::Visited) => return,
        Some(VisitState::Visiting) => {
            if !*cycle {
                let start = stack
                    .iter()
                    .position(|candidate| candidate == id)
                    .unwrap_or(0);
                let mut path = stack[start..].to_vec();
                path.push(id.to_owned());
                diagnostics.push(error_with_hint(
                    "rules.cycle",
                    format!("Computed rule dependency cycle: {}.", path.join(" -> ")),
                    "/rules",
                    "Remove the circular computed dependency.",
                ));
            }
            *cycle = true;
            return;
        }
        None => {}
    }
    state.insert(id.to_owned(), VisitState::Visiting);
    stack.push(id.to_owned());
    if let Some(dependencies) = graph.get(id) {
        for dependency in dependencies {
            visit_computed(dependency, graph, state, stack, order, cycle, diagnostics);
        }
    }
    stack.pop();
    state.insert(id.to_owned(), VisitState::Visited);
    order.push(id.to_owned());
}
