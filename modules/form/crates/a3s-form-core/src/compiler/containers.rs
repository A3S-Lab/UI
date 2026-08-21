use std::collections::{HashMap, HashSet};

use crate::{CanonicalValue, Diagnostic};

use super::{error, CompiledNode};

pub(super) fn inspect_container_semantics(
    source_nodes: &[CanonicalValue],
    nodes: &mut [CompiledNode],
    indices: &HashMap<String, usize>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let parents = parents_by_child(nodes);
    inspect_wizards(nodes, indices, &parents, diagnostics);
    inspect_repeaters(source_nodes, nodes, indices, diagnostics);
    bind_repeater_ancestors(source_nodes, nodes, indices, &parents, diagnostics);
}

fn parents_by_child(nodes: &[CompiledNode]) -> HashMap<String, Vec<String>> {
    let mut parents = HashMap::<String, Vec<String>>::new();
    for node in nodes {
        for child in &node.children {
            let entry = parents.entry(child.clone()).or_default();
            if !entry.contains(&node.id) {
                entry.push(node.id.clone());
            }
        }
    }
    parents
}

fn inspect_wizards(
    nodes: &[CompiledNode],
    indices: &HashMap<String, usize>,
    parents: &HashMap<String, Vec<String>>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for (index, node) in nodes.iter().enumerate() {
        let path = format!("/ui/nodes/{index}");
        if node.page_role.is_some() && node.layout.as_deref() != Some("page") {
            diagnostics.push(error(
                "wizard.page_role_scope",
                format!(
                    "Node {} may declare pageRole only when layout is page.",
                    node.id
                ),
                format!("{path}/pageRole"),
            ));
        }
        if node.layout.as_deref() == Some("page") {
            let owners = parents.get(&node.id).map(Vec::as_slice).unwrap_or_default();
            let valid_owner = owners.len() == 1
                && indices
                    .get(&owners[0])
                    .is_some_and(|owner| nodes[*owner].layout.as_deref() == Some("wizard"));
            if !valid_owner || !["group", "section"].contains(&node.kind.as_str()) {
                diagnostics.push(error(
                    "wizard.page_parent",
                    format!(
                        "Wizard page {} must be a group or section owned by exactly one wizard.",
                        node.id
                    ),
                    path.clone(),
                ));
            }
        }
        if node.layout.as_deref() != Some("wizard") {
            continue;
        }
        if !["root", "group", "section"].contains(&node.kind.as_str()) {
            diagnostics.push(error(
                "wizard.container",
                format!(
                    "Wizard {} must use a root, group, or section node.",
                    node.id
                ),
                path.clone(),
            ));
        }
        let pages = node
            .children
            .iter()
            .filter_map(|id| indices.get(id).map(|index| &nodes[*index]))
            .collect::<Vec<_>>();
        if pages.is_empty() {
            diagnostics.push(error(
                "wizard.empty",
                format!("Wizard {} must contain at least one page.", node.id),
                path.clone(),
            ));
        }
        for page in &pages {
            if page.layout.as_deref() != Some("page")
                || !["group", "section"].contains(&page.kind.as_str())
            {
                diagnostics.push(error(
                    "wizard.page",
                    format!(
                        "Wizard {} may contain only group or section nodes with page layout.",
                        node.id
                    ),
                    format!("{path}/children"),
                ));
            }
        }
        let review_pages = pages
            .iter()
            .filter(|page| page.page_role.as_deref() == Some("review"))
            .collect::<Vec<_>>();
        if review_pages.len() > 1 {
            diagnostics.push(error(
                "wizard.review_count",
                format!("Wizard {} may contain only one review page.", node.id),
                format!("{path}/children"),
            ));
        }
        if let Some(review) = review_pages.first() {
            if pages.last().is_none_or(|page| page.id != review.id) {
                diagnostics.push(error(
                    "wizard.review_order",
                    format!("Wizard {} review page must be the final page.", node.id),
                    format!("{path}/children"),
                ));
            }
        }
        inspect_wizard_ancestors(node, nodes, indices, parents, &path, diagnostics);
    }
}

fn inspect_wizard_ancestors(
    wizard: &CompiledNode,
    nodes: &[CompiledNode],
    indices: &HashMap<String, usize>,
    parents: &HashMap<String, Vec<String>>,
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let mut pending = parents.get(&wizard.id).cloned().unwrap_or_default();
    let mut visited = HashSet::new();
    while let Some(parent_id) = pending.pop() {
        if !visited.insert(parent_id.clone()) {
            continue;
        }
        let Some(parent) = indices.get(&parent_id).map(|index| &nodes[*index]) else {
            continue;
        };
        if parent.layout.as_deref() == Some("wizard") || parent.kind == "repeater" {
            diagnostics.push(error(
                "wizard.nested",
                format!(
                    "Wizard {} cannot be nested inside another wizard or repeater.",
                    wizard.id
                ),
                path,
            ));
            break;
        }
        pending.extend(parents.get(&parent_id).into_iter().flatten().cloned());
    }
}

fn inspect_repeaters(
    source_nodes: &[CanonicalValue],
    nodes: &[CompiledNode],
    indices: &HashMap<String, usize>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for (source_index, source) in source_nodes.iter().enumerate() {
        let Some(id) = source.get("id").and_then(CanonicalValue::as_str) else {
            continue;
        };
        let Some(node) = indices.get(id).map(|index| &nodes[*index]) else {
            continue;
        };
        let path = format!("/ui/nodes/{source_index}");
        if source.get("dataGrid").is_some() {
            inspect_data_grid_configuration(source, node, &path, diagnostics);
        }
        if source.get("layout").and_then(CanonicalValue::as_str) == Some("data-grid") {
            inspect_data_grid(node, nodes, indices, &path, diagnostics);
        }
        if node.kind != "repeater" {
            continue;
        }
        let Some(schema) = &node.schema else {
            continue;
        };
        if schema.get("type").and_then(CanonicalValue::as_str) != Some("array") {
            diagnostics.push(error(
                "repeater.schema_type",
                format!("Repeater {} must bind to an array schema.", node.id),
                format!("{path}/schemaPath"),
            ));
            continue;
        }
        let items = schema.get("items");
        if !node.children.is_empty()
            && items
                .and_then(|items| items.get("type"))
                .and_then(CanonicalValue::as_str)
                != Some("object")
        {
            diagnostics.push(error(
                "repeater.items_type",
                format!(
                    "Repeater {} with child fields must use an object item schema.",
                    node.id
                ),
                format!("{path}/children"),
            ));
        }
        if let Some(item_key) = source.get("itemKey") {
            let valid = item_key.as_str().is_some_and(|item_key| {
                !item_key.is_empty()
                    && !item_key.contains('.')
                    && items
                        .and_then(|items| items.get("properties"))
                        .and_then(|properties| properties.get(item_key))
                        .and_then(|schema| schema.get("type"))
                        .and_then(CanonicalValue::as_str)
                        == Some("string")
                    && items
                        .and_then(|items| items.get("required"))
                        .and_then(CanonicalValue::as_array)
                        .is_some_and(|required| {
                            required
                                .iter()
                                .any(|value| value.as_str() == Some(item_key))
                        })
            });
            if !valid {
                diagnostics.push(error(
                    "repeater.item_key",
                    format!(
                        "Repeater {} itemKey must reference a required string property in its item schema.",
                        node.id
                    ),
                    format!("{path}/itemKey"),
                ));
            }
        }
    }
}

fn inspect_data_grid_configuration(
    source: &CanonicalValue,
    grid: &CompiledNode,
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let Some(configuration) = source.get("dataGrid") else {
        return;
    };
    if source.get("layout").and_then(CanonicalValue::as_str) != Some("data-grid") {
        diagnostics.push(error(
            "data_grid.config_scope",
            format!(
                "Node {} may declare dataGrid only when layout is data-grid.",
                grid.id
            ),
            format!("{path}/dataGrid"),
        ));
    }
    if configuration.as_object().is_none() {
        diagnostics.push(error(
            "data_grid.config",
            format!("Data grid {} must use an object configuration.", grid.id),
            format!("{path}/dataGrid"),
        ));
        return;
    }

    inspect_data_grid_mode(
        configuration,
        grid,
        path,
        "editMode",
        &["inline", "dialog"],
        "data_grid.edit_mode",
        "edit mode",
        diagnostics,
    );
    inspect_data_grid_mode(
        configuration,
        grid,
        path,
        "selection",
        &["none", "multiple"],
        "data_grid.selection",
        "selection mode",
        diagnostics,
    );
    inspect_data_grid_mode(
        configuration,
        grid,
        path,
        "sorting",
        &["none", "single"],
        "data_grid.sorting",
        "sorting mode",
        diagnostics,
    );
    inspect_data_grid_mode(
        configuration,
        grid,
        path,
        "filtering",
        &["none", "search"],
        "data_grid.filtering",
        "filtering mode",
        diagnostics,
    );
    inspect_data_grid_mode(
        configuration,
        grid,
        path,
        "paste",
        &["none", "append"],
        "data_grid.paste",
        "paste mode",
        diagnostics,
    );
    inspect_data_grid_mode(
        configuration,
        grid,
        path,
        "fill",
        &["none", "down"],
        "data_grid.fill",
        "fill mode",
        diagnostics,
    );

    if configuration.get("fill").and_then(CanonicalValue::as_str) == Some("down")
        && configuration
            .get("selection")
            .and_then(CanonicalValue::as_str)
            != Some("multiple")
    {
        diagnostics.push(error(
            "data_grid.fill_selection",
            format!(
                "Data grid {} requires multiple selection for fill down.",
                grid.id
            ),
            format!("{path}/dataGrid/fill"),
        ));
    }

    let Some(virtualization) = configuration.get("virtualization") else {
        return;
    };
    if virtualization.as_object().is_none() {
        diagnostics.push(error(
            "data_grid.virtualization",
            format!(
                "Data grid {} must use an object virtualization configuration.",
                grid.id
            ),
            format!("{path}/dataGrid/virtualization"),
        ));
        return;
    }
    if virtualization.get("mode").and_then(CanonicalValue::as_str) != Some("rows") {
        diagnostics.push(error(
            "data_grid.virtualization_mode",
            format!(
                "Data grid {} uses an unsupported virtualization mode.",
                grid.id
            ),
            format!("{path}/dataGrid/virtualization/mode"),
        ));
    }
    inspect_data_grid_integer(
        virtualization,
        grid,
        path,
        "viewportHeight",
        240,
        960,
        "data_grid.virtualization_height",
        "virtualization viewport height",
        diagnostics,
    );
    inspect_data_grid_integer(
        virtualization,
        grid,
        path,
        "overscan",
        2,
        24,
        "data_grid.virtualization_overscan",
        "virtualization overscan",
        diagnostics,
    );
    if configuration
        .get("editMode")
        .and_then(CanonicalValue::as_str)
        != Some("dialog")
    {
        diagnostics.push(error(
            "data_grid.virtualization_edit_mode",
            format!(
                "Data grid {} requires dialog editing when row virtualization is enabled.",
                grid.id
            ),
            format!("{path}/dataGrid/virtualization"),
        ));
    }
}

#[allow(clippy::too_many_arguments)]
fn inspect_data_grid_mode(
    configuration: &CanonicalValue,
    grid: &CompiledNode,
    path: &str,
    field: &str,
    supported: &[&str],
    code: &str,
    label: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let Some(value) = configuration.get(field) else {
        return;
    };
    if value
        .as_str()
        .is_some_and(|value| supported.contains(&value))
    {
        return;
    }
    diagnostics.push(error(
        code,
        format!("Data grid {} uses an unsupported {label}.", grid.id),
        format!("{path}/dataGrid/{field}"),
    ));
}

#[allow(clippy::too_many_arguments)]
fn inspect_data_grid_integer(
    configuration: &CanonicalValue,
    grid: &CompiledNode,
    path: &str,
    field: &str,
    minimum: u64,
    maximum: u64,
    code: &str,
    label: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let Some(value) = configuration.get(field) else {
        return;
    };
    let valid = value.as_f64().is_some_and(|value| {
        value.fract() == 0.0 && value >= minimum as f64 && value <= maximum as f64
    });
    if valid {
        return;
    }
    diagnostics.push(error(
        code,
        format!(
            "Data grid {} {label} must be an integer from {minimum} to {maximum}.",
            grid.id
        ),
        format!("{path}/dataGrid/virtualization/{field}"),
    ));
}

fn inspect_data_grid(
    grid: &CompiledNode,
    nodes: &[CompiledNode],
    indices: &HashMap<String, usize>,
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if grid.kind != "repeater" {
        diagnostics.push(error(
            "data_grid.container",
            format!("Data grid {} must use a repeater node.", grid.id),
            path,
        ));
    }
    let valid_items = grid.schema.as_ref().is_some_and(|schema| {
        schema.get("type").and_then(CanonicalValue::as_str) == Some("array")
            && schema
                .get("items")
                .and_then(|items| items.get("type"))
                .and_then(CanonicalValue::as_str)
                == Some("object")
    });
    if !valid_items {
        diagnostics.push(error(
            "data_grid.items_type",
            format!("Data grid {} must bind to an array of objects.", grid.id),
            format!("{path}/schemaPath"),
        ));
    }
    if grid.children.is_empty() {
        diagnostics.push(error(
            "data_grid.columns",
            format!(
                "Data grid {} must contain at least one field column.",
                grid.id
            ),
            format!("{path}/children"),
        ));
    }
    for child in &grid.children {
        if indices
            .get(child)
            .is_some_and(|index| nodes[*index].kind == "field")
        {
            continue;
        }
        diagnostics.push(error(
            "data_grid.column",
            format!(
                "Data grid {} may contain only direct field columns.",
                grid.id
            ),
            format!("{path}/children"),
        ));
    }
}

fn bind_repeater_ancestors(
    source_nodes: &[CanonicalValue],
    nodes: &mut [CompiledNode],
    indices: &HashMap<String, usize>,
    parents: &HashMap<String, Vec<String>>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for index in 0..nodes.len() {
        let Some(template) = nodes[index].value_path_template.clone() else {
            continue;
        };
        if !template.contains('*') {
            nodes[index].repeater_ancestors = Vec::new();
            continue;
        }
        let mut ancestors = Vec::new();
        let mut visited = HashSet::from([nodes[index].id.clone()]);
        let mut current_id = nodes[index].id.clone();
        let mut invalid = false;
        loop {
            let current_parents = parents
                .get(&current_id)
                .map(Vec::as_slice)
                .unwrap_or_default();
            if current_parents.is_empty() {
                break;
            }
            if current_parents.len() != 1 || !visited.insert(current_parents[0].clone()) {
                invalid = true;
                break;
            }
            let parent_id = current_parents[0].clone();
            if indices
                .get(&parent_id)
                .is_some_and(|parent| nodes[*parent].kind == "repeater")
            {
                ancestors.insert(0, parent_id.clone());
            }
            current_id = parent_id;
        }
        let segments = template.split('.').collect::<Vec<_>>();
        let wildcard_positions = segments
            .iter()
            .enumerate()
            .filter_map(|(index, segment)| (*segment == "*").then_some(index))
            .collect::<Vec<_>>();
        if ancestors.len() != wildcard_positions.len() {
            invalid = true;
        }
        for (ancestor_index, ancestor_id) in ancestors.iter().enumerate() {
            let expected_prefix = segments[..wildcard_positions[ancestor_index]].join(".");
            let repeater_template = indices
                .get(ancestor_id)
                .and_then(|index| nodes[*index].value_path_template.as_deref());
            if repeater_template != Some(expected_prefix.as_str()) {
                invalid = true;
            }
        }
        if invalid {
            let source_index = source_nodes
                .iter()
                .position(|source| {
                    source.get("id").and_then(CanonicalValue::as_str)
                        == Some(nodes[index].id.as_str())
                })
                .unwrap_or(0);
            diagnostics.push(error(
                "node.dynamic_scope",
                format!(
                    "Node {} must be nested under the repeaters declared by its schemaPath.",
                    nodes[index].id
                ),
                format!("/ui/nodes/{source_index}/schemaPath"),
            ));
        } else {
            nodes[index].repeater_ancestors = ancestors;
        }
    }
}
