use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use a3s_form_core::{
    canonical_sha256, canonicalize_value, compile_bytes, parse_json, CanonicalValue,
    COMPILE_REQUEST_API_VERSION,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    api_version: String,
    cases: Vec<CompilerCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompilerCase {
    name: String,
    input_json: String,
    normalized_document_sha256: String,
    digest: String,
    form_plan_sha256: String,
    diagnostics: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatrixFixture {
    api_version: String,
    base_input_json: String,
    cases: Vec<MatrixCase>,
}

#[derive(Debug, Deserialize)]
struct MatrixCase {
    name: String,
    operations: Vec<Mutation>,
    diagnostics: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticsFixture {
    api_version: String,
    base_input_json: String,
    cases: Vec<DiagnosticCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SemanticsFixture {
    api_version: String,
    bases: HashMap<String, serde_json::Value>,
    cases: Vec<SemanticsCase>,
}

#[derive(Debug, Deserialize)]
struct SemanticsCase {
    name: String,
    base: String,
    operations: Vec<Mutation>,
    diagnostics: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct DiagnosticCase {
    name: String,
    operations: Vec<Mutation>,
    options: Option<serde_json::Value>,
    diagnostics: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct Mutation {
    op: String,
    path: String,
    value: Option<serde_json::Value>,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-foundation-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read compiler fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode compiler fixture {}: {error}",
            path.display()
        )
    })
}

fn matrix_fixture() -> MatrixFixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-matrix-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!("failed to read matrix fixture {}: {error}", path.display())
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode matrix fixture {}: {error}",
            path.display()
        )
    })
}

fn diagnostics_fixture() -> DiagnosticsFixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-diagnostics-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read diagnostics fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode diagnostics fixture {}: {error}",
            path.display()
        )
    })
}

fn semantics_fixture() -> SemanticsFixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-semantics-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read semantics fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode semantics fixture {}: {error}",
            path.display()
        )
    })
}

fn compile(document: &str) -> CanonicalValue {
    let request =
        format!(r#"{{"apiVersion":"{COMPILE_REQUEST_API_VERSION}","document":{document}}}"#,);
    let response = compile_bytes(request.as_bytes()).expect("response should encode");
    parse_json(&response).expect("response should be canonical JSON")
}

#[test]
fn matches_shared_compiler_foundation_cases() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-compiler-foundation-conformance/v1"
    );

    for case in fixture.cases {
        let response = compile(&case.input_json);
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(true)
        );
        assert_eq!(
            response.get("digest").and_then(CanonicalValue::as_str),
            Some(case.digest.as_str()),
            "{}",
            case.name,
        );
        let normalized = response
            .get("normalizedDocumentJson")
            .and_then(CanonicalValue::as_str)
            .unwrap_or_else(|| panic!("{} omitted normalized document", case.name));
        assert_eq!(
            canonical_sha256(normalized.as_bytes()),
            case.normalized_document_sha256,
            "{}",
            case.name,
        );
        let plan = response
            .get("formPlan")
            .unwrap_or_else(|| panic!("{} omitted FormPlan", case.name));
        let canonical_plan = canonicalize_value(plan)
            .unwrap_or_else(|error| panic!("{} plan failed to encode: {error}", case.name));
        assert_eq!(
            canonical_sha256(&canonical_plan),
            case.form_plan_sha256,
            "{}",
            case.name,
        );
        assert_eq!(
            response
                .get("diagnostics")
                .and_then(CanonicalValue::as_array)
                .map(<[CanonicalValue]>::len),
            Some(case.diagnostics.len()),
            "{}",
            case.name,
        );
    }
}

#[test]
fn validates_matrix_semantics_instead_of_falling_back() {
    let response = compile(
        r#"{"kind":"a3s.form","apiVersion":"a3s.dev/form/v1alpha1","revision":1,"metadata":{"title":"Matrix"},"schema":{"type":"object","properties":{"choice":{"type":"string"}}},"ui":{"root":"root","nodes":[{"id":"root","kind":"root","children":["choice"]},{"id":"choice","kind":"field","schemaPath":"/properties/choice","widget":"matrix-single","matrix":{"rows":[],"columns":[]}}]}}"#,
    );
    assert_eq!(
        response.get("ok").and_then(CanonicalValue::as_bool),
        Some(false)
    );
    let codes = response
        .get("diagnostics")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .filter_map(|diagnostic| diagnostic.get("code").and_then(CanonicalValue::as_str))
        .collect::<Vec<_>>();
    assert!(codes.contains(&"matrix.rows"));
    assert!(codes.contains(&"matrix.columns"));
    assert!(!codes.contains(&"compiler.semantic_not_ported"));
}

#[test]
fn matches_complete_matrix_diagnostics() {
    let fixture = matrix_fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-compiler-matrix-conformance/v1"
    );
    let base: serde_json::Value =
        serde_json::from_str(&fixture.base_input_json).expect("base matrix document should decode");
    for case in fixture.cases {
        let mut document = base.clone();
        for mutation in &case.operations {
            apply_mutation(&mut document, mutation);
        }
        let input =
            serde_json::to_string(&document).expect("mutated matrix document should encode");
        let response = compile(&input);
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(false),
            "{}",
            case.name,
        );
        let diagnostics = response
            .get("diagnostics")
            .expect("matrix response should contain diagnostics");
        let diagnostics =
            serde_json::to_value(diagnostics).expect("matrix diagnostics should encode");
        assert_eq!(
            diagnostics,
            serde_json::Value::Array(case.diagnostics),
            "{}",
            case.name,
        );
    }
}

#[test]
fn matches_complete_compiler_failure_diagnostics() {
    let fixture = diagnostics_fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-compiler-diagnostics-conformance/v1"
    );
    let base: serde_json::Value = serde_json::from_str(&fixture.base_input_json)
        .expect("base diagnostics document should decode");
    for case in fixture.cases {
        let mut document = base.clone();
        for mutation in &case.operations {
            apply_mutation(&mut document, mutation);
        }
        let mut request = serde_json::json!({
            "apiVersion": COMPILE_REQUEST_API_VERSION,
            "document": document,
        });
        if let Some(options) = case.options {
            request["options"] = options;
        }
        let request = serde_json::to_vec(&request).expect("compile request should encode");
        let response = compile_bytes(&request).expect("compile response should encode");
        let response = parse_json(&response).expect("compile response should decode");
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(false),
            "{}",
            case.name,
        );
        let diagnostics = response
            .get("diagnostics")
            .expect("compiler response should contain diagnostics");
        let diagnostics =
            serde_json::to_value(diagnostics).expect("compiler diagnostics should encode");
        assert_eq!(
            diagnostics,
            serde_json::Value::Array(case.diagnostics),
            "{}",
            case.name,
        );
    }
}

#[test]
fn matches_complete_container_rule_and_data_source_diagnostics() {
    let SemanticsFixture {
        api_version,
        bases,
        cases,
    } = semantics_fixture();
    assert_eq!(
        api_version,
        "a3s.dev/form-compiler-semantics-conformance/v1"
    );
    for case in cases {
        let mut document = bases
            .get(&case.base)
            .unwrap_or_else(|| panic!("{} references missing base {}", case.name, case.base))
            .clone();
        for mutation in &case.operations {
            apply_mutation(&mut document, mutation);
        }
        let input = serde_json::to_string(&document)
            .unwrap_or_else(|error| panic!("{} failed to encode: {error}", case.name));
        let response = compile(&input);
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(false),
            "{}",
            case.name,
        );
        let diagnostics = response
            .get("diagnostics")
            .unwrap_or_else(|| panic!("{} omitted diagnostics", case.name));
        let diagnostics = serde_json::to_value(diagnostics)
            .unwrap_or_else(|error| panic!("{} diagnostics failed to encode: {error}", case.name));
        assert_eq!(
            diagnostics,
            serde_json::Value::Array(case.diagnostics),
            "{}",
            case.name,
        );
    }
}

fn apply_mutation(document: &mut serde_json::Value, mutation: &Mutation) {
    let (parent_pointer, encoded_key) = mutation
        .path
        .rsplit_once('/')
        .unwrap_or_else(|| panic!("invalid mutation path {}", mutation.path));
    let key = encoded_key.replace("~1", "/").replace("~0", "~");
    let parent = if parent_pointer.is_empty() {
        document
    } else {
        document
            .pointer_mut(parent_pointer)
            .unwrap_or_else(|| panic!("mutation parent {} does not exist", mutation.path))
    };
    match (mutation.op.as_str(), parent) {
        ("set", serde_json::Value::Object(parent)) => {
            parent.insert(
                key,
                mutation
                    .value
                    .clone()
                    .expect("set mutation should contain a value"),
            );
        }
        ("set", serde_json::Value::Array(parent)) => {
            let index = key
                .parse::<usize>()
                .unwrap_or_else(|_| panic!("invalid array index in {}", mutation.path));
            parent[index] = mutation
                .value
                .clone()
                .expect("set mutation should contain a value");
        }
        ("remove", serde_json::Value::Object(parent)) => {
            parent
                .remove(&key)
                .unwrap_or_else(|| panic!("mutation target {} does not exist", mutation.path));
        }
        ("remove", serde_json::Value::Array(parent)) => {
            let index = key
                .parse::<usize>()
                .unwrap_or_else(|_| panic!("invalid array index in {}", mutation.path));
            parent.remove(index);
        }
        _ => panic!("unsupported mutation {} at {}", mutation.op, mutation.path),
    }
}

#[test]
fn returns_protocol_failures_in_the_versioned_response() {
    let response = compile_bytes(br#"{"apiVersion":"unsupported","document":{}}"#)
        .expect("protocol failure response should encode");
    let response = parse_json(&response).expect("response should decode");
    assert_eq!(
        response.get("ok").and_then(CanonicalValue::as_bool),
        Some(false)
    );
    assert_eq!(
        response
            .get("diagnostics")
            .and_then(CanonicalValue::as_array)
            .and_then(|diagnostics| diagnostics.first())
            .and_then(|diagnostic| diagnostic.get("code"))
            .and_then(CanonicalValue::as_str),
        Some("protocol.api_version"),
    );
}
