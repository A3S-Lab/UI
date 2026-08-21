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
    cases: Vec<ResourceCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResourceCase {
    name: String,
    node_count: usize,
    max_nodes: usize,
    ok: bool,
    normalized_document_sha256: Option<String>,
    digest: Option<String>,
    form_plan_sha256: Option<String>,
    diagnostics: Vec<serde_json::Value>,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-resources-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read resource fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode resource fixture {}: {error}",
            path.display()
        )
    })
}

fn resource_document(node_count: usize) -> serde_json::Value {
    let names = (1..node_count)
        .map(|index| format!("field{index:04}"))
        .collect::<Vec<_>>();
    let properties = names
        .iter()
        .map(|name| (name.clone(), serde_json::json!({ "type": "string" })))
        .collect::<serde_json::Map<_, _>>();
    let mut nodes = vec![serde_json::json!({
        "id": "root",
        "kind": "root",
        "children": names,
    })];
    nodes.extend(names.iter().map(|name| {
        serde_json::json!({
            "id": name,
            "kind": "field",
            "schemaPath": format!("/properties/{name}"),
            "widget": "text",
        })
    }));
    serde_json::json!({
        "kind": "a3s.form",
        "apiVersion": "a3s.dev/form/v1alpha1",
        "revision": 1,
        "metadata": {
            "title": format!("Resource corpus {node_count}"),
            "locale": "en-US",
        },
        "schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": properties,
            "additionalProperties": false,
        },
        "ui": {
            "root": "root",
            "nodes": nodes,
        },
        "rules": [],
        "dataSources": [],
        "actions": [],
    })
}

#[test]
fn matches_resource_boundary_golden_cases() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-compiler-resource-conformance/v1"
    );
    assert_eq!(fixture.generator, "flat-string-fields-v1");
    for case in fixture.cases {
        let request = serde_json::json!({
            "apiVersion": COMPILE_REQUEST_API_VERSION,
            "document": resource_document(case.node_count),
            "options": { "limits": { "maxNodes": case.max_nodes } },
        });
        let request = serde_json::to_vec(&request).expect("resource request should encode");
        let response = compile_bytes(&request).expect("resource response should encode");
        let response = parse_json(&response).expect("resource response should decode");
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(case.ok),
            "{}",
            case.name,
        );
        let diagnostics = response
            .get("diagnostics")
            .expect("resource response should contain diagnostics");
        assert_eq!(
            serde_json::to_value(diagnostics).expect("resource diagnostics should encode"),
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
            .expect("successful resource response should contain normalized document");
        assert_eq!(
            Some(canonical_sha256(normalized.as_bytes())),
            case.normalized_document_sha256,
            "{}",
            case.name,
        );
        let plan = response
            .get("formPlan")
            .expect("successful resource response should contain FormPlan");
        let plan = canonicalize_value(plan).expect("resource FormPlan should canonicalize");
        assert_eq!(
            Some(canonical_sha256(&plan)),
            case.form_plan_sha256,
            "{}",
            case.name,
        );
    }
}
