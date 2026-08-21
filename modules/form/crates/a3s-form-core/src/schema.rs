use std::collections::HashSet;

use crate::{canonicalize_value, CanonicalValue, Diagnostic};

pub const A3S_FORM_SCHEMA_PROFILE_1_ID: &str = "a3s.dev/form-schema-profile/1";
pub const JSON_SCHEMA_2020_12_DIALECT: &str = "https://json-schema.org/draft/2020-12/schema";

pub const SUPPORTED_SCHEMA_FORMATS: &[&str] = &[
    "email",
    "uri",
    "date",
    "date-time",
    "time",
    "hostname",
    "ipv4",
    "ipv6",
    "uuid",
];

const SUPPORTED_SCHEMA_TYPES: &[&str] = &[
    "null", "boolean", "object", "array", "number", "integer", "string",
];

pub const SUPPORTED_SCHEMA_KEYWORDS: &[&str] = &[
    "$schema",
    "$id",
    "type",
    "title",
    "description",
    "default",
    "enum",
    "const",
    "properties",
    "required",
    "items",
    "additionalProperties",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "multipleOf",
    "minItems",
    "maxItems",
    "uniqueItems",
];

/// Validates A3S Form Schema Profile 1 recursively without interpreting form
/// layout or runtime values.
#[must_use]
pub fn inspect_schema_profile(schema: &CanonicalValue, path: &str) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    if schema.as_object().is_none() {
        diagnostics.push(schema_diagnostic(
            "schema.definition.invalid",
            "Schema must be an object.",
            path,
            None,
        ));
        return diagnostics;
    }
    inspect_schema(schema, path, &mut diagnostics);
    diagnostics
}

fn inspect_schema(schema: &CanonicalValue, path: &str, diagnostics: &mut Vec<Diagnostic>) {
    let Some(entries) = schema.as_object() else {
        return;
    };
    for (keyword, _) in entries {
        if !SUPPORTED_SCHEMA_KEYWORDS.contains(&keyword.as_str()) {
            diagnostics.push(schema_diagnostic(
                "schema.keyword.unsupported",
                format!("Schema keyword {keyword} is not supported by A3S Form Schema Profile 1."),
                format!("{path}/{}", pointer_token(keyword)),
                Some(format!(
                    "Use one of: {}.",
                    SUPPORTED_SCHEMA_KEYWORDS.join(", ")
                )),
            ));
        }
    }

    if let Some(dialect) = schema.get("$schema") {
        let valid_dialect = dialect.as_str().is_some_and(|dialect| {
            path == "/schema"
                && (dialect == JSON_SCHEMA_2020_12_DIALECT
                    || dialect == format!("{JSON_SCHEMA_2020_12_DIALECT}#"))
        });
        if !valid_dialect {
            diagnostics.push(schema_diagnostic(
                "schema.dialect",
                format!(
                    "Schema dialect must be {JSON_SCHEMA_2020_12_DIALECT} at the document root."
                ),
                format!("{path}/$schema"),
                None,
            ));
        }
    }
    if let Some(identifier) = schema.get("$id") {
        let valid = identifier
            .as_str()
            .is_some_and(|identifier| url::Url::parse(identifier).is_ok());
        if !valid {
            invalid_keyword(diagnostics, path, "$id", "must be an absolute URI");
        }
    }
    if let Some(schema_type) = schema.get("type") {
        if !schema_type
            .as_str()
            .is_some_and(|schema_type| SUPPORTED_SCHEMA_TYPES.contains(&schema_type))
        {
            invalid_keyword(
                diagnostics,
                path,
                "type",
                "must be a supported singular JSON type",
            );
        }
    }
    for keyword in ["title", "description"] {
        if schema
            .get(keyword)
            .is_some_and(|value| value.as_str().is_none())
        {
            invalid_keyword(diagnostics, path, keyword, "must be a string");
        }
    }

    if let Some(values) = schema.get("enum") {
        let valid = values.as_array().is_some_and(|values| {
            if values.is_empty() {
                return false;
            }
            let mut canonical = HashSet::with_capacity(values.len());
            values.iter().all(|value| {
                canonicalize_value(value)
                    .map(|value| canonical.insert(value))
                    .unwrap_or(false)
            })
        });
        if !valid {
            invalid_keyword(
                diagnostics,
                path,
                "enum",
                "must contain unique finite JSON values",
            );
        }
    }

    inspect_properties(schema, path, diagnostics);
    inspect_required(schema, path, diagnostics);

    if let Some(items) = schema.get("items") {
        if items.as_object().is_none() {
            invalid_keyword(diagnostics, path, "items", "must be a schema object");
        } else {
            inspect_schema(items, &format!("{path}/items"), diagnostics);
        }
    }
    if let Some(additional) = schema.get("additionalProperties") {
        if additional.as_bool().is_some() {
            // Boolean additionalProperties is complete as-is.
        } else if additional.as_object().is_some() {
            inspect_schema(
                additional,
                &format!("{path}/additionalProperties"),
                diagnostics,
            );
        } else {
            invalid_keyword(
                diagnostics,
                path,
                "additionalProperties",
                "must be a boolean or schema",
            );
        }
    }

    for keyword in ["minLength", "maxLength", "minItems", "maxItems"] {
        if schema
            .get(keyword)
            .is_some_and(|value| !is_non_negative_safe_integer(value))
        {
            invalid_keyword(
                diagnostics,
                path,
                keyword,
                "must be a non-negative safe integer",
            );
        }
    }
    inspect_ordered_bounds(schema, path, diagnostics, "minLength", "maxLength");
    inspect_ordered_bounds(schema, path, diagnostics, "minItems", "maxItems");

    for keyword in ["minimum", "maximum"] {
        if schema
            .get(keyword)
            .is_some_and(|value| value.as_f64().is_none())
        {
            invalid_keyword(diagnostics, path, keyword, "must be a finite number");
        }
    }
    if schema
        .get("multipleOf")
        .is_some_and(|value| value.as_f64().is_none_or(|value| value <= 0.0))
    {
        invalid_keyword(
            diagnostics,
            path,
            "multipleOf",
            "must be a finite number greater than zero",
        );
    }
    inspect_ordered_bounds(schema, path, diagnostics, "minimum", "maximum");

    if schema
        .get("uniqueItems")
        .is_some_and(|value| value.as_bool().is_none())
    {
        invalid_keyword(diagnostics, path, "uniqueItems", "must be a boolean");
    }
    if let Some(pattern) = schema.get("pattern") {
        match pattern.as_str() {
            None => invalid_keyword(diagnostics, path, "pattern", "must be a string"),
            Some(pattern) if regress::Regex::new(pattern).is_err() => {
                diagnostics.push(schema_diagnostic(
                    "schema.pattern.invalid",
                    "Schema pattern must be a valid ECMAScript Unicode regular expression.",
                    format!("{path}/pattern"),
                    None,
                ));
            }
            Some(_) => {}
        }
    }
    if let Some(format) = schema.get("format") {
        if !format
            .as_str()
            .is_some_and(|format| SUPPORTED_SCHEMA_FORMATS.contains(&format))
        {
            diagnostics.push(schema_diagnostic(
                "schema.format.unsupported",
                format!(
                    "Schema format {} is not supported by A3S Form Schema Profile 1.",
                    display_json_scalar(format)
                ),
                format!("{path}/format"),
                Some(format!(
                    "Use one of: {}.",
                    SUPPORTED_SCHEMA_FORMATS.join(", ")
                )),
            ));
        }
    }
}

fn inspect_properties(schema: &CanonicalValue, path: &str, diagnostics: &mut Vec<Diagnostic>) {
    let Some(properties) = schema.get("properties") else {
        return;
    };
    let Some(entries) = properties.as_object() else {
        invalid_keyword(
            diagnostics,
            path,
            "properties",
            "must be an object of child schemas",
        );
        return;
    };

    for (name, child) in entries {
        let child_path = format!("{path}/properties/{}", pointer_token(name));
        if name.is_empty() || name.contains('.') || name == "*" {
            diagnostics.push(schema_diagnostic(
                "schema.property.invalid",
                "Property names must be non-empty and cannot contain dots or the reserved * segment.",
                child_path.clone(),
                Some("A3S Form uses dot-separated paths and * for repeater rows.".to_owned()),
            ));
        }
        if child.as_object().is_none() {
            diagnostics.push(schema_diagnostic(
                "schema.definition.invalid",
                "Every properties entry must be a schema object.",
                child_path,
                None,
            ));
        } else {
            inspect_schema(child, &child_path, diagnostics);
        }
    }
}

fn inspect_required(schema: &CanonicalValue, path: &str, diagnostics: &mut Vec<Diagnostic>) {
    let Some(required) = schema.get("required") else {
        return;
    };
    let Some(values) = required.as_array() else {
        invalid_keyword(
            diagnostics,
            path,
            "required",
            "must contain unique, non-empty strings",
        );
        return;
    };
    let mut names = HashSet::with_capacity(values.len());
    let valid_names = values.iter().all(|value| {
        value
            .as_str()
            .is_some_and(|name| !name.is_empty() && names.insert(name))
    });
    if !valid_names {
        invalid_keyword(
            diagnostics,
            path,
            "required",
            "must contain unique, non-empty strings",
        );
        return;
    }
    let declared = schema.get("properties").and_then(CanonicalValue::as_object);
    if declared.is_none_or(|properties| {
        names
            .iter()
            .any(|name| !properties.iter().any(|(candidate, _)| candidate == *name))
    }) {
        invalid_keyword(
            diagnostics,
            path,
            "required",
            "must reference declared properties",
        );
    }
}

fn inspect_ordered_bounds(
    schema: &CanonicalValue,
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
    minimum: &str,
    maximum: &str,
) {
    let Some(minimum_value) = schema.get(minimum).and_then(CanonicalValue::as_f64) else {
        return;
    };
    let Some(maximum_value) = schema.get(maximum).and_then(CanonicalValue::as_f64) else {
        return;
    };
    if minimum_value > maximum_value {
        invalid_keyword(
            diagnostics,
            path,
            maximum,
            &format!("must be greater than or equal to {minimum}"),
        );
    }
}

fn is_non_negative_safe_integer(value: &CanonicalValue) -> bool {
    value.as_f64().is_some_and(|value| {
        value >= 0.0 && value.fract() == 0.0 && value <= 9_007_199_254_740_991.0
    })
}

fn pointer_token(value: &str) -> String {
    value.replace('~', "~0").replace('/', "~1")
}

fn invalid_keyword(
    diagnostics: &mut Vec<Diagnostic>,
    path: &str,
    keyword: &str,
    expectation: &str,
) {
    diagnostics.push(schema_diagnostic(
        "schema.keyword.invalid",
        format!("Schema keyword {keyword} {expectation}."),
        format!("{path}/{}", pointer_token(keyword)),
        None,
    ));
}

fn schema_diagnostic(
    code: impl Into<String>,
    message: impl Into<String>,
    path: impl Into<String>,
    hint: Option<String>,
) -> Diagnostic {
    let mut diagnostic = Diagnostic::error(code, message, path);
    diagnostic.hint = hint;
    diagnostic
}

fn display_json_scalar(value: &CanonicalValue) -> String {
    match value {
        CanonicalValue::String(value) => value.clone(),
        CanonicalValue::Number(value) => value.to_string(),
        CanonicalValue::Bool(value) => value.to_string(),
        CanonicalValue::Null => "null".to_owned(),
        CanonicalValue::Array(_) => "array".to_owned(),
        CanonicalValue::Object(_) => "object".to_owned(),
    }
}
