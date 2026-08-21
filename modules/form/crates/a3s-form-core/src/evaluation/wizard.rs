use std::collections::{HashMap, HashSet};

use crate::CanonicalValue;

use super::expression::evaluate_expression;
use super::FieldError;

pub(super) fn filter_inactive_wizard_page_errors(
    plan: &CanonicalValue,
    value: &CanonicalValue,
    errors: Vec<FieldError>,
) -> Vec<FieldError> {
    let topology = WizardTopology::build(plan);
    errors
        .into_iter()
        .filter(|error| {
            if error.path.is_empty() {
                return true;
            }
            let owners = topology.value_path_owners(plan, &error.path);
            if owners.outside_wizard || owners.page_ids.is_empty() {
                return true;
            }
            owners
                .page_ids
                .iter()
                .any(|page_id| field_visible(plan, page_id, value))
        })
        .collect()
}

struct WizardTopology {
    page_by_node_id: HashMap<String, String>,
}

struct ValuePathOwners {
    page_ids: Vec<String>,
    outside_wizard: bool,
}

impl WizardTopology {
    fn build(plan: &CanonicalValue) -> Self {
        let nodes = plan
            .get("nodes")
            .and_then(CanonicalValue::as_array)
            .unwrap_or_default();
        let node_by_id = plan
            .get("nodeById")
            .and_then(CanonicalValue::as_object)
            .unwrap_or_default();
        let mut page_by_node_id = HashMap::new();
        for wizard in nodes
            .iter()
            .filter(|node| node.get("layout").and_then(CanonicalValue::as_str) == Some("wizard"))
        {
            let pages = wizard
                .get("children")
                .and_then(CanonicalValue::as_array)
                .unwrap_or_default()
                .iter()
                .filter_map(CanonicalValue::as_str)
                .filter(|id| {
                    node(node_by_id, id)
                        .and_then(|node| node.get("layout"))
                        .and_then(CanonicalValue::as_str)
                        == Some("page")
                });
            for page_id in pages {
                let mut pending = vec![page_id.to_owned()];
                let mut visited = HashSet::new();
                while let Some(node_id) = pending.pop() {
                    if !visited.insert(node_id.clone()) {
                        continue;
                    }
                    page_by_node_id.insert(node_id.clone(), page_id.to_owned());
                    if let Some(children) = node(node_by_id, &node_id)
                        .and_then(|node| node.get("children"))
                        .and_then(CanonicalValue::as_array)
                    {
                        pending.extend(
                            children
                                .iter()
                                .filter_map(CanonicalValue::as_str)
                                .map(str::to_owned),
                        );
                    }
                }
            }
        }
        Self { page_by_node_id }
    }

    fn value_path_owners(&self, plan: &CanonicalValue, path: &str) -> ValuePathOwners {
        let mut page_ids = Vec::new();
        let mut outside_wizard = false;
        for node in plan
            .get("nodes")
            .and_then(CanonicalValue::as_array)
            .unwrap_or_default()
        {
            let template = node
                .get("valuePathTemplate")
                .or_else(|| node.get("valuePath"))
                .and_then(CanonicalValue::as_str);
            if template.is_none_or(|template| !paths_share_hierarchy(template, path)) {
                continue;
            }
            let node_id = node.get("id").and_then(CanonicalValue::as_str);
            if let Some(page_id) = node_id.and_then(|id| self.page_by_node_id.get(id)) {
                if !page_ids.contains(page_id) {
                    page_ids.push(page_id.clone());
                }
            } else {
                outside_wizard = true;
            }
        }
        ValuePathOwners {
            page_ids,
            outside_wizard,
        }
    }
}

fn node<'a>(entries: &'a [(String, CanonicalValue)], id: &str) -> Option<&'a CanonicalValue> {
    entries
        .iter()
        .find_map(|(candidate, node)| (candidate == id).then_some(node))
}

fn paths_share_hierarchy(template: &str, path: &str) -> bool {
    if template.is_empty() || path.is_empty() {
        return false;
    }
    let template = template.split('.').collect::<Vec<_>>();
    let path = path.split('.').collect::<Vec<_>>();
    template
        .iter()
        .zip(path.iter())
        .all(|(expected, actual)| *expected == "*" || expected == actual)
}

fn field_visible(plan: &CanonicalValue, node_id: &str, value: &CanonicalValue) -> bool {
    let node = plan.get("nodeById").and_then(|nodes| nodes.get(node_id));
    let mut visible = node.and_then(|node| node.get("hidden")) != Some(&CanonicalValue::Bool(true));
    let operation_limit = plan
        .get("expressionOperationLimit")
        .and_then(CanonicalValue::as_f64)
        .unwrap_or(256.0) as u64;
    for rule in plan
        .get("rules")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
    {
        if rule.get("target").and_then(CanonicalValue::as_str) != Some(node_id)
            || rule.get("kind").and_then(CanonicalValue::as_str) != Some("visible")
        {
            continue;
        }
        visible = rule
            .get("expression")
            .and_then(|expression| {
                evaluate_expression(expression, value, operation_limit, None).ok()
            })
            .flatten()
            .is_some_and(|result| truthy(&result));
    }
    visible
}

fn truthy(value: &CanonicalValue) -> bool {
    match value {
        CanonicalValue::Null | CanonicalValue::Bool(false) => false,
        CanonicalValue::Number(value) => *value != 0.0,
        CanonicalValue::String(value) => !value.is_empty(),
        CanonicalValue::Bool(true) | CanonicalValue::Array(_) | CanonicalValue::Object(_) => true,
    }
}
