use std::collections::HashSet;

use crate::{CanonicalValue, Diagnostic};

use super::{error, CompiledNode};

const MAX_ROWS: usize = 50;
const MAX_COLUMNS: usize = 20;
const MAX_CELLS: usize = 500;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MatrixValueType {
    String,
    Number,
    Boolean,
}

pub(super) fn inspect_matrix_node(
    source: &CanonicalValue,
    index: usize,
    node: Option<&CompiledNode>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let path = format!("/ui/nodes/{index}");
    let widget = source.get("widget").and_then(CanonicalValue::as_str);
    if !matches!(widget, Some("matrix-single" | "matrix-multiple")) {
        if source.get("matrix").is_some() {
            diagnostics.push(error(
                "matrix.scope",
                "matrix is available only on matrix-single or matrix-multiple fields.",
                format!("{path}/matrix"),
            ));
        }
        return;
    }

    if node.is_none_or(|node| node.kind != "field") {
        diagnostics.push(error(
            "matrix.container",
            "Matrix widgets must use field nodes.",
            format!("{path}/kind"),
        ));
    }
    if source.get("options").is_some() || source.get("dataSource").is_some() {
        diagnostics.push(error(
            "matrix.options_source",
            "Matrix columns must be declared by matrix.columns and cannot use options or dataSource.",
            path.clone(),
        ));
    }

    let Some(matrix) = source.get("matrix").and_then(CanonicalValue::as_object) else {
        diagnostics.push(error(
            "matrix.definition",
            "Matrix fields must declare a matrix object containing rows and columns.",
            format!("{path}/matrix"),
        ));
        return;
    };
    let rows = matrix
        .iter()
        .find_map(|(key, value)| (key == "rows").then_some(value))
        .and_then(CanonicalValue::as_array);
    let columns = matrix
        .iter()
        .find_map(|(key, value)| (key == "columns").then_some(value))
        .and_then(CanonicalValue::as_array);
    let (Some(rows), Some(columns)) = (rows, columns) else {
        diagnostics.push(error(
            "matrix.definition",
            "matrix.rows and matrix.columns must be arrays.",
            format!("{path}/matrix"),
        ));
        return;
    };

    if rows.is_empty() {
        diagnostics.push(error(
            "matrix.rows",
            "A matrix must contain at least one row.",
            format!("{path}/matrix/rows"),
        ));
    }
    if columns.is_empty() {
        diagnostics.push(error(
            "matrix.columns",
            "A matrix must contain at least one column.",
            format!("{path}/matrix/columns"),
        ));
    }
    if rows.len() > MAX_ROWS
        || columns.len() > MAX_COLUMNS
        || rows.len().saturating_mul(columns.len()) > MAX_CELLS
    {
        diagnostics.push(error(
            "matrix.limits",
            format!(
                "A matrix may contain at most {MAX_ROWS} rows, {MAX_COLUMNS} columns, and {MAX_CELLS} cells."
            ),
            format!("{path}/matrix"),
        ));
    }

    let mut row_ids = Vec::with_capacity(rows.len());
    let mut unique_row_ids = HashSet::with_capacity(rows.len());
    let mut valid_rows = true;
    for (row_index, row) in rows.iter().enumerate() {
        let row_path = format!("{path}/matrix/rows/{row_index}");
        let id = row.get("id").and_then(CanonicalValue::as_str);
        let label = row.get("label").and_then(CanonicalValue::as_str);
        let valid = row.as_object().is_some()
            && id.is_some_and(|id| !id.is_empty() && !id.contains('.') && id != "*")
            && label.is_some_and(|label| !label.trim().is_empty())
            && row
                .get("description")
                .is_none_or(|value| value.as_str().is_some())
            && row
                .get("disabled")
                .is_none_or(|value| value.as_bool().is_some());
        if !valid {
            valid_rows = false;
            diagnostics.push(error(
                "matrix.row",
                "Matrix rows must contain a valid stable id and a non-empty label.",
                row_path,
            ));
            continue;
        }
        let id = id.expect("validated matrix row id");
        if !unique_row_ids.insert(id.to_owned()) {
            valid_rows = false;
            diagnostics.push(error(
                "matrix.row_duplicate",
                format!("Matrix row ID {id} is duplicated."),
                format!("{row_path}/id"),
            ));
        } else {
            row_ids.push(id.to_owned());
        }
    }

    let mut column_values = Vec::with_capacity(columns.len());
    let mut column_type = None;
    let mut valid_columns = true;
    for (column_index, column) in columns.iter().enumerate() {
        let column_path = format!("{path}/matrix/columns/{column_index}");
        let label = column.get("label").and_then(CanonicalValue::as_str);
        let value = column.get("value");
        let value_type = value.and_then(matrix_value_type);
        let valid = column.as_object().is_some()
            && label.is_some_and(|label| !label.trim().is_empty())
            && value_type.is_some()
            && column
                .get("disabled")
                .is_none_or(|value| value.as_bool().is_some());
        if !valid {
            valid_columns = false;
            diagnostics.push(error(
                "matrix.column",
                "Matrix columns must contain a non-empty label and a string, number, or boolean value.",
                column_path,
            ));
            continue;
        }
        let value = value.expect("validated matrix column value");
        let value_type = value_type.expect("validated matrix column value type");
        if column_type.is_some_and(|expected| expected != value_type) {
            valid_columns = false;
            diagnostics.push(error(
                "matrix.column_type",
                "All column values in a matrix must use the same primitive type.",
                format!("{column_path}/value"),
            ));
        }
        column_type.get_or_insert(value_type);
        if column_values.contains(value) {
            valid_columns = false;
            diagnostics.push(error(
                "matrix.column_duplicate",
                format!(
                    "Matrix column value {} is duplicated.",
                    display_primitive(value)
                ),
                format!("{column_path}/value"),
            ));
        }
        column_values.push(value.clone());
    }

    let Some(node_schema) = node.and_then(|node| node.schema.as_ref()) else {
        return;
    };
    let Some(column_type) = column_type else {
        return;
    };
    if !valid_rows || !valid_columns {
        return;
    }

    let properties = node_schema
        .get("properties")
        .and_then(CanonicalValue::as_object);
    if node_schema.get("type").and_then(CanonicalValue::as_str) != Some("object")
        || properties.is_none()
        || node_schema
            .get("additionalProperties")
            .and_then(CanonicalValue::as_bool)
            != Some(false)
    {
        diagnostics.push(error(
            "matrix.schema_type",
            "Matrix fields must bind to an object schema with additionalProperties set to false.",
            format!("{path}/schemaPath"),
        ));
        return;
    }
    let properties = properties.expect("validated matrix properties");
    if properties.len() != unique_row_ids.len()
        || properties
            .iter()
            .any(|(property, _)| !unique_row_ids.contains(property))
    {
        diagnostics.push(error(
            "matrix.schema_properties",
            "Matrix schema properties must exactly match the IDs in matrix.rows.",
            format!("{path}/schemaPath"),
        ));
    }

    for row_id in row_ids {
        let row_schema = properties
            .iter()
            .find_map(|(property, schema)| (property == &row_id).then_some(schema));
        let valid_single = widget == Some("matrix-single")
            && row_schema.is_some_and(|schema| {
                schema_accepts_matrix_type(schema, column_type)
                    && enum_matches(schema.get("enum"), &column_values)
            });
        let valid_multiple = widget == Some("matrix-multiple")
            && row_schema.is_some_and(|schema| {
                schema.get("type").and_then(CanonicalValue::as_str) == Some("array")
                    && schema.get("uniqueItems").and_then(CanonicalValue::as_bool) == Some(true)
                    && schema.get("items").is_some_and(|items| {
                        schema_accepts_matrix_type(items, column_type)
                            && enum_matches(items.get("enum"), &column_values)
                    })
                    && bounded_selection(schema.get("minItems"), columns.len())
                    && bounded_selection(schema.get("maxItems"), columns.len())
            });
        if valid_single || valid_multiple {
            continue;
        }
        diagnostics.push(error(
            "matrix.row_schema",
            format!(
                "Matrix row {row_id} schema does not match the {} column contract.",
                widget.expect("validated matrix widget")
            ),
            format!("{path}/schemaPath"),
        ));
    }
}

fn matrix_value_type(value: &CanonicalValue) -> Option<MatrixValueType> {
    match value {
        CanonicalValue::String(_) => Some(MatrixValueType::String),
        CanonicalValue::Number(_) => Some(MatrixValueType::Number),
        CanonicalValue::Bool(_) => Some(MatrixValueType::Boolean),
        CanonicalValue::Null | CanonicalValue::Array(_) | CanonicalValue::Object(_) => None,
    }
}

fn schema_accepts_matrix_type(schema: &CanonicalValue, value_type: MatrixValueType) -> bool {
    let schema_type = schema.get("type").and_then(CanonicalValue::as_str);
    match value_type {
        MatrixValueType::String => schema_type == Some("string"),
        MatrixValueType::Number => matches!(schema_type, Some("number" | "integer")),
        MatrixValueType::Boolean => schema_type == Some("boolean"),
    }
}

fn enum_matches(values: Option<&CanonicalValue>, expected: &[CanonicalValue]) -> bool {
    values
        .and_then(CanonicalValue::as_array)
        .is_some_and(|values| {
            values.len() == expected.len()
                && expected
                    .iter()
                    .all(|expected| values.iter().any(|value| value == expected))
        })
}

fn bounded_selection(value: Option<&CanonicalValue>, column_count: usize) -> bool {
    value.is_none_or(|value| {
        value
            .as_f64()
            .is_some_and(|value| value <= column_count as f64)
    })
}

fn display_primitive(value: &CanonicalValue) -> String {
    match value {
        CanonicalValue::String(value) => value.clone(),
        CanonicalValue::Number(value) => {
            if *value == 0.0 {
                return "0".to_owned();
            }
            let mut buffer = ryu_js::Buffer::new();
            buffer.format_finite(*value).to_owned()
        }
        CanonicalValue::Bool(value) => value.to_string(),
        CanonicalValue::Null | CanonicalValue::Array(_) | CanonicalValue::Object(_) => {
            "[invalid]".to_owned()
        }
    }
}
