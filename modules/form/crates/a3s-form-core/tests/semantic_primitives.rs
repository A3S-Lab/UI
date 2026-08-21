use std::fs;
use std::path::PathBuf;

use a3s_form_core::{
    analyze_expression, inspect_schema_profile, is_value_path_scope_compatible, parse_json,
    schema_pointer_to_value_path_template,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    api_version: String,
    schema_cases: Vec<SchemaCase>,
    expression_cases: Vec<ExpressionCase>,
    pointer_cases: Vec<PointerCase>,
    scope_cases: Vec<ScopeCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SchemaCase {
    name: String,
    input_json: String,
    diagnostics: Vec<ExpectedDiagnostic>,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
struct ExpectedDiagnostic {
    code: String,
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpressionCase {
    name: String,
    input_json: String,
    ok: bool,
    size: Option<u64>,
    field_paths: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct PointerCase {
    name: String,
    pointer: String,
    template: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ScopeCase {
    target: String,
    dependency: String,
    compatible: bool,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/semantic-primitives-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read semantic fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode semantic fixture {}: {error}",
            path.display()
        )
    })
}

#[test]
fn matches_schema_profile_cases() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-semantic-primitives-conformance/v1"
    );

    for case in fixture.schema_cases {
        let schema = parse_json(case.input_json.as_bytes())
            .unwrap_or_else(|error| panic!("{} failed to parse: {error}", case.name));
        let actual = inspect_schema_profile(&schema, "/schema")
            .into_iter()
            .map(|diagnostic| ExpectedDiagnostic {
                code: diagnostic.code,
                path: diagnostic.path,
            })
            .collect::<Vec<_>>();
        assert_eq!(actual, case.diagnostics, "{}", case.name);
    }
}

#[test]
fn matches_expression_analysis_cases() {
    for case in fixture().expression_cases {
        let expression = parse_json(case.input_json.as_bytes())
            .unwrap_or_else(|error| panic!("{} failed to parse: {error}", case.name));
        let result = analyze_expression(&expression);
        assert_eq!(result.is_ok(), case.ok, "{}", case.name);
        if let Ok(analysis) = result {
            assert_eq!(Some(analysis.size), case.size, "{}", case.name);
            assert_eq!(
                Some(analysis.field_paths),
                case.field_paths,
                "{}",
                case.name
            );
        }
    }
}

#[test]
fn matches_pointer_and_scope_cases() {
    let fixture = fixture();
    for case in fixture.pointer_cases {
        let template = schema_pointer_to_value_path_template(&case.pointer)
            .unwrap_or_else(|error| panic!("{} failed to decode: {error}", case.name));
        assert_eq!(template, case.template, "{}", case.name);
    }
    for case in fixture.scope_cases {
        assert_eq!(
            is_value_path_scope_compatible(&case.target, &case.dependency),
            case.compatible,
            "{} <- {}",
            case.target,
            case.dependency,
        );
    }
}
