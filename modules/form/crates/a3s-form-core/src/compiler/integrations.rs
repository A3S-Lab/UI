use std::collections::HashSet;

use crate::{CanonicalValue, Diagnostic};

use super::{error, error_with_hint, pointer_token, schema_has_value_path, CompiledNode};

pub(super) fn inspect_data_sources(
    document: &CanonicalValue,
    schema: &CanonicalValue,
    nodes: &[CompiledNode],
    capabilities: &[String],
    diagnostics: &mut Vec<Diagnostic>,
) {
    const KEYS: &[&str] = &[
        "id",
        "registryKey",
        "parameters",
        "dependencies",
        "trigger",
        "searchable",
        "debounceMs",
        "pageSize",
        "cacheTtlMs",
    ];
    let mut ids = HashSet::new();
    for (index, source) in document
        .get("dataSources")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .enumerate()
    {
        let path = format!("/dataSources/{index}");
        let Some(entries) = source.as_object() else {
            diagnostics.push(error(
                "data_source.definition",
                "Data-source definition must be an object.",
                path,
            ));
            continue;
        };
        for (key, _) in entries {
            if !KEYS.contains(&key.as_str()) {
                diagnostics.push(error(
                    "data_source.keyword",
                    format!("Unsupported data-source property {key}."),
                    format!("{path}/{}", pointer_token(key)),
                ));
            }
        }
        match source.get("id").and_then(CanonicalValue::as_str) {
            None => diagnostics.push(error(
                "data_source.id",
                "Data-source id must be a non-empty string.",
                format!("{path}/id"),
            )),
            Some(id) if id.trim().is_empty() => diagnostics.push(error(
                "data_source.id",
                "Data-source id must be a non-empty string.",
                format!("{path}/id"),
            )),
            Some(id) if !ids.insert(id) => diagnostics.push(error(
                "data_source.duplicate",
                format!("Data-source id {id} is duplicated."),
                format!("{path}/id"),
            )),
            Some(_) => {}
        }
        let registry_key = source.get("registryKey").and_then(CanonicalValue::as_str);
        if registry_key.is_none_or(|key| key.trim().is_empty()) {
            diagnostics.push(error(
                "data_source.registry_key",
                "Data-source registryKey must be a non-empty string.",
                format!("{path}/registryKey"),
            ));
        }
        if source
            .get("parameters")
            .is_some_and(|value| value.as_object().is_none())
        {
            diagnostics.push(error(
                "data_source.parameters",
                "Data-source parameters must be a JSON object with finite values.",
                format!("{path}/parameters"),
            ));
        }
        inspect_data_source_dependencies(schema, nodes, source, &path, diagnostics);
        if source.get("trigger").is_some_and(|value| {
            !value
                .as_str()
                .is_some_and(|trigger| ["mount", "focus"].contains(&trigger))
        }) {
            diagnostics.push(error(
                "data_source.trigger",
                "Data-source trigger must be mount or focus.",
                format!("{path}/trigger"),
            ));
        }
        if source
            .get("searchable")
            .is_some_and(|value| value.as_bool().is_none())
        {
            diagnostics.push(error(
                "data_source.searchable",
                "Data-source searchable must be a boolean.",
                format!("{path}/searchable"),
            ));
        }
        inspect_bounded_integer(source, &path, "cacheTtlMs", 0, 86_400_000, diagnostics);
        inspect_bounded_integer(source, &path, "debounceMs", 0, 5_000, diagnostics);
        inspect_bounded_integer(source, &path, "pageSize", 1, 200, diagnostics);
        if !capabilities.is_empty()
            && registry_key
                .is_some_and(|key| !capabilities.iter().any(|candidate| candidate == key))
        {
            diagnostics.push(error(
                "capability.data_source",
                format!(
                    "Host capability {} is not declared.",
                    registry_key.unwrap_or_default()
                ),
                format!("{path}/registryKey"),
            ));
        }
    }
}

fn inspect_data_source_dependencies(
    schema: &CanonicalValue,
    nodes: &[CompiledNode],
    source: &CanonicalValue,
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let Some(dependencies) = source.get("dependencies") else {
        return;
    };
    let Some(dependencies) = dependencies.as_array() else {
        diagnostics.push(error(
            "data_source.dependencies",
            "Data-source dependencies must contain at most 32 paths.",
            format!("{path}/dependencies"),
        ));
        return;
    };
    if dependencies.len() > 32 {
        diagnostics.push(error(
            "data_source.dependencies",
            "Data-source dependencies must contain at most 32 paths.",
            format!("{path}/dependencies"),
        ));
        return;
    }
    let mut seen = HashSet::new();
    let source_id = source.get("id").and_then(CanonicalValue::as_str);
    for (index, dependency) in dependencies.iter().enumerate() {
        let dependency_path = format!("{path}/dependencies/{index}");
        let Some(dependency) = dependency.as_str().filter(|value| !value.trim().is_empty()) else {
            diagnostics.push(error(
                "data_source.dependency",
                "Data-source dependency must be a non-empty value path.",
                dependency_path,
            ));
            continue;
        };
        if !seen.insert(dependency) {
            diagnostics.push(error(
                "data_source.dependency_duplicate",
                format!("Data-source dependency {dependency} is duplicated."),
                dependency_path.clone(),
            ));
        }
        let exists = schema_has_value_path(schema, dependency);
        if !exists {
            diagnostics.push(error(
                "data_source.dependency_reference",
                format!("Data-source dependency {dependency} is not declared by the schema."),
                dependency_path.clone(),
            ));
        }
        if exists && dependency.contains('*') {
            if let Some(node) = nodes.iter().find(|node| {
                node.data_source.as_deref() == source_id
                    && node.value_path_template.as_ref().is_none_or(|target| {
                        !crate::is_value_path_scope_compatible(target, dependency)
                    })
            }) {
                diagnostics.push(error_with_hint(
                    "data_source.dependency_scope",
                    format!(
                        "Data-source dependency {dependency} cannot be bound from node {}.",
                        node.id
                    ),
                    dependency_path,
                    "Attach the source inside the same repeater scope or use a global dependency.",
                ));
            }
        }
    }
}

fn inspect_bounded_integer(
    source: &CanonicalValue,
    path: &str,
    field: &str,
    minimum: u64,
    maximum: u64,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let Some(value) = source.get(field) else {
        return;
    };
    let valid = value.as_f64().is_some_and(|value| {
        value.fract() == 0.0 && value >= minimum as f64 && value <= maximum as f64
    });
    if !valid {
        let code = match field {
            "cacheTtlMs" => "data_source.cache_ttl",
            "debounceMs" => "data_source.debounce",
            "pageSize" => "data_source.page_size",
            _ => "data_source.integer",
        };
        diagnostics.push(error(
            code,
            format!("Data-source {field} must be an integer from {minimum} to {maximum}."),
            format!("{path}/{field}"),
        ));
    }
}

pub(super) fn inspect_actions(
    document: &CanonicalValue,
    capabilities: &[String],
    diagnostics: &mut Vec<Diagnostic>,
) {
    for (index, action) in document
        .get("actions")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .enumerate()
    {
        let path = format!("/actions/{index}");
        let registry_key = action.get("registryKey").and_then(CanonicalValue::as_str);
        if action.as_object().is_none() || registry_key.is_none() {
            diagnostics.push(error(
                "action.definition",
                "Action definition is invalid.",
                path,
            ));
            continue;
        }
        if !capabilities.is_empty()
            && registry_key
                .is_some_and(|key| !capabilities.iter().any(|candidate| candidate == key))
        {
            diagnostics.push(error(
                "capability.action",
                format!(
                    "Host capability {} is not declared.",
                    registry_key.unwrap_or_default()
                ),
                format!("{path}/registryKey"),
            ));
        }
    }
}
