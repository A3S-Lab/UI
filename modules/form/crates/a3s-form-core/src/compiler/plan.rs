use std::collections::HashMap;

use crate::{canonical_sha256, canonicalize_value, CanonicalValue, FORM_SCHEMA_PROFILE_1};

use super::{sort_utf16, CompiledNode, RuleAnalysis};

const FORM_PLAN_API_VERSION: &str = "a3s.dev/form-plan/v1alpha1";

pub(super) fn normalize_document(mut document: CanonicalValue) -> CanonicalValue {
    if let Some(metadata) = document.get_mut("metadata") {
        insert_default(
            metadata,
            "locale",
            CanonicalValue::String("zh-CN".to_owned()),
        );
        insert_default(metadata, "tags", CanonicalValue::Array(Vec::new()));
    }
    for field in ["rules", "dataSources", "actions"] {
        insert_default(&mut document, field, CanonicalValue::Array(Vec::new()));
    }
    if let Some(sources) = document
        .get_mut("dataSources")
        .and_then(CanonicalValue::as_array_mut)
    {
        for source in sources {
            insert_default(source, "parameters", CanonicalValue::Object(Vec::new()));
            insert_default(source, "dependencies", CanonicalValue::Array(Vec::new()));
            insert_default(
                source,
                "trigger",
                CanonicalValue::String("mount".to_owned()),
            );
            insert_default(source, "searchable", CanonicalValue::Bool(false));
            insert_default(source, "cacheTtlMs", CanonicalValue::Number(0.0));
            insert_default(source, "debounceMs", CanonicalValue::Number(250.0));
            insert_default(source, "pageSize", CanonicalValue::Number(50.0));
        }
    }
    if let Some(nodes) = document
        .get_mut("ui")
        .and_then(|ui| ui.get_mut("nodes"))
        .and_then(CanonicalValue::as_array_mut)
    {
        for node in nodes {
            let kind = node
                .get("kind")
                .and_then(CanonicalValue::as_str)
                .map(str::to_owned);
            if !matches!(kind.as_deref(), Some("field" | "content")) {
                insert_default(node, "children", CanonicalValue::Array(Vec::new()));
            }
            if kind.as_deref() == Some("field") {
                insert_default(node, "widget", CanonicalValue::String("text".to_owned()));
            }
            if node.get("layout").and_then(CanonicalValue::as_str) == Some("page") {
                insert_default(node, "pageRole", CanonicalValue::String("form".to_owned()));
            }
            insert_default(node, "width", CanonicalValue::Number(12.0));
        }
    }
    document
}

fn insert_default(target: &mut CanonicalValue, key: &str, value: CanonicalValue) {
    if target.get(key).is_none() {
        target.insert(key, value);
    }
}

pub(super) fn seal_document(document: &mut CanonicalValue) -> Result<String, String> {
    let digest = document_digest(document)?;
    document.insert("digest", CanonicalValue::String(digest.clone()));
    Ok(digest)
}

pub(super) fn document_digest(document: &CanonicalValue) -> Result<String, String> {
    let mut publishable = document.clone();
    publishable.remove("digest");
    let canonical = canonicalize_value(&publishable).map_err(|error| error.to_string())?;
    Ok(format!("sha256:{}", canonical_sha256(&canonical)))
}

pub(super) fn build_plan(
    normalized: &CanonicalValue,
    nodes: &[CompiledNode],
    node_indices: &HashMap<String, usize>,
    rule_analysis: &RuleAnalysis,
    expression_operation_limit: u64,
    digest: &str,
) -> CanonicalValue {
    let normalized_nodes = normalized
        .get("ui")
        .and_then(|ui| ui.get("nodes"))
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .map(|source| {
            let mut compiled = source.clone();
            if let Some(node) = source
                .get("id")
                .and_then(CanonicalValue::as_str)
                .and_then(|id| node_indices.get(id))
                .map(|index| &nodes[*index])
            {
                if let Some(schema) = &node.schema {
                    compiled.insert("schema", schema.clone());
                }
                if let Some(path) = &node.value_path {
                    compiled.insert("valuePath", CanonicalValue::String(path.clone()));
                }
                if let Some(template) = &node.value_path_template {
                    compiled.insert(
                        "valuePathTemplate",
                        CanonicalValue::String(template.clone()),
                    );
                }
                compiled.insert(
                    "repeaterAncestors",
                    string_array(node.repeater_ancestors.clone()),
                );
                compiled.insert("depth", CanonicalValue::Number(node.depth as f64));
            }
            compiled
        })
        .collect::<Vec<_>>();
    let node_by_id = normalized_nodes
        .iter()
        .filter_map(|node| {
            node.get("id")
                .and_then(CanonicalValue::as_str)
                .map(|id| (id.to_owned(), node.clone()))
        })
        .collect::<Vec<_>>();

    let data_sources = normalized
        .get("dataSources")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default();
    let subscriptions = normalized_nodes
        .iter()
        .filter_map(|source| {
            let id = source.get("id").and_then(CanonicalValue::as_str)?;
            let node = node_indices.get(id).map(|index| &nodes[*index])?;
            let mut paths = Vec::new();
            if let Some(path) = node
                .value_path_template
                .as_ref()
                .or(node.value_path.as_ref())
            {
                paths.push(path.clone());
            }
            for rule in normalized
                .get("rules")
                .and_then(CanonicalValue::as_array)
                .unwrap_or_default()
            {
                if rule.get("target").and_then(CanonicalValue::as_str) != Some(id) {
                    continue;
                }
                if let Some(rule_id) = rule.get("id").and_then(CanonicalValue::as_str) {
                    if let Some((_, dependencies)) = rule_analysis
                        .dependencies
                        .iter()
                        .find(|(candidate, _)| candidate == rule_id)
                    {
                        push_unique(&mut paths, dependencies.iter().cloned());
                    }
                }
            }
            if let Some(source_id) = &node.data_source {
                if let Some(source) = data_sources.iter().find(|source| {
                    source.get("id").and_then(CanonicalValue::as_str) == Some(source_id)
                }) {
                    let dependencies = source
                        .get("dependencies")
                        .and_then(CanonicalValue::as_array)
                        .unwrap_or_default()
                        .iter()
                        .filter_map(CanonicalValue::as_str)
                        .map(str::to_owned);
                    push_unique(&mut paths, dependencies);
                }
            }
            sort_utf16(&mut paths);
            Some((id.to_owned(), string_array(paths)))
        })
        .collect::<Vec<_>>();

    object(vec![
        string_field("apiVersion", FORM_PLAN_API_VERSION),
        string_field("schemaProfile", FORM_SCHEMA_PROFILE_1),
        (
            "sourceRevision".to_owned(),
            normalized
                .get("revision")
                .cloned()
                .unwrap_or(CanonicalValue::Number(0.0)),
        ),
        string_field("sourceDigest", digest),
        (
            "metadata".to_owned(),
            normalized
                .get("metadata")
                .cloned()
                .unwrap_or(CanonicalValue::Object(Vec::new())),
        ),
        (
            "schema".to_owned(),
            normalized
                .get("schema")
                .cloned()
                .unwrap_or(CanonicalValue::Object(Vec::new())),
        ),
        (
            "root".to_owned(),
            normalized
                .get("ui")
                .and_then(|ui| ui.get("root"))
                .cloned()
                .unwrap_or(CanonicalValue::String(String::new())),
        ),
        ("nodes".to_owned(), CanonicalValue::Array(normalized_nodes)),
        ("nodeById".to_owned(), CanonicalValue::Object(node_by_id)),
        (
            "rules".to_owned(),
            normalized
                .get("rules")
                .cloned()
                .unwrap_or(CanonicalValue::Array(Vec::new())),
        ),
        (
            "ruleDependencies".to_owned(),
            CanonicalValue::Object(
                rule_analysis
                    .dependencies
                    .iter()
                    .map(|(id, paths)| (id.clone(), string_array(paths.clone())))
                    .collect(),
            ),
        ),
        (
            "nodeSubscriptions".to_owned(),
            CanonicalValue::Object(subscriptions),
        ),
        (
            "expressionOperationLimit".to_owned(),
            CanonicalValue::Number(expression_operation_limit as f64),
        ),
        (
            "dependencyOrder".to_owned(),
            string_array(rule_analysis.dependency_order.clone()),
        ),
        (
            "dataSources".to_owned(),
            normalized
                .get("dataSources")
                .cloned()
                .unwrap_or(CanonicalValue::Array(Vec::new())),
        ),
        (
            "actions".to_owned(),
            normalized
                .get("actions")
                .cloned()
                .unwrap_or(CanonicalValue::Array(Vec::new())),
        ),
    ])
}

fn object(entries: Vec<(String, CanonicalValue)>) -> CanonicalValue {
    CanonicalValue::Object(entries)
}

fn string_field(key: &str, value: &str) -> (String, CanonicalValue) {
    (key.to_owned(), CanonicalValue::String(value.to_owned()))
}

fn string_array(values: Vec<String>) -> CanonicalValue {
    CanonicalValue::Array(values.into_iter().map(CanonicalValue::String).collect())
}

fn push_unique(values: &mut Vec<String>, additional: impl IntoIterator<Item = String>) {
    for value in additional {
        if !values.contains(&value) {
            values.push(value);
        }
    }
}
