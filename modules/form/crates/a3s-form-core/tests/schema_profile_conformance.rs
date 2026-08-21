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
    generator: String,
    cases: Vec<SchemaCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SchemaCase {
    name: String,
    schema_input_json: String,
    ok: bool,
    normalized_document_sha256: Option<String>,
    digest: Option<String>,
    form_plan_sha256: Option<String>,
    diagnostics: Vec<serde_json::Value>,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-schema-profile-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!("failed to read schema fixture {}: {error}", path.display())
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode schema fixture {}: {error}",
            path.display()
        )
    })
}

fn schema_document(case: &SchemaCase) -> serde_json::Value {
    serde_json::json!({
        "kind": "a3s.form",
        "apiVersion": "a3s.dev/form/v1alpha1",
        "revision": 1,
        "metadata": { "title": format!("Schema {}", case.name), "locale": "en-US" },
        "schema": serde_json::from_str::<serde_json::Value>(&case.schema_input_json)
            .expect("schema input should decode"),
        "ui": { "root": "root", "nodes": [{ "id": "root", "kind": "root", "children": [] }] },
        "rules": [],
        "dataSources": [],
        "actions": [],
    })
}

#[test]
fn matches_schema_profile_compiler_cases() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-compiler-schema-profile-conformance/v1"
    );
    assert_eq!(fixture.generator, "root-only-form-v1");
    for case in fixture.cases {
        let request = serde_json::json!({
            "apiVersion": COMPILE_REQUEST_API_VERSION,
            "document": schema_document(&case),
        });
        let request = serde_json::to_vec(&request).expect("schema request should encode");
        let response = compile_bytes(&request).expect("schema response should encode");
        let response = parse_json(&response).expect("schema response should decode");
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(case.ok),
            "{}",
            case.name,
        );
        let diagnostics = response
            .get("diagnostics")
            .expect("schema response should contain diagnostics");
        assert_eq!(
            serde_json::to_value(diagnostics).expect("schema diagnostics should encode"),
            serde_json::Value::Array(case.diagnostics),
            "{}",
            case.name,
        );
        if !case.ok {
            continue;
        }
        assert_eq!(
            response.get("digest").and_then(CanonicalValue::as_str),
            case.digest.as_deref(),
            "{}",
            case.name,
        );
        let normalized = response
            .get("normalizedDocumentJson")
            .and_then(CanonicalValue::as_str)
            .expect("successful schema response should contain normalized document");
        assert_eq!(
            Some(canonical_sha256(normalized.as_bytes())),
            case.normalized_document_sha256,
            "{}",
            case.name,
        );
        let plan = response
            .get("formPlan")
            .expect("successful schema response should contain FormPlan");
        let plan = canonicalize_value(plan).expect("schema FormPlan should canonicalize");
        assert_eq!(
            Some(canonical_sha256(&plan)),
            case.form_plan_sha256,
            "{}",
            case.name,
        );
    }
}
