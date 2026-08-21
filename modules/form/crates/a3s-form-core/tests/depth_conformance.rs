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
    cases: Vec<DepthCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DepthCase {
    name: String,
    depth: usize,
    max_depth: usize,
    ok: bool,
    normalized_document_sha256: Option<String>,
    digest: Option<String>,
    form_plan_sha256: Option<String>,
    diagnostics: Vec<serde_json::Value>,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/compiler-depth-v1.json");
    let bytes = fs::read(&path)
        .unwrap_or_else(|error| panic!("failed to read depth fixture {}: {error}", path.display()));
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!("failed to decode depth fixture {}: {error}", path.display())
    })
}

fn depth_document(depth: usize) -> serde_json::Value {
    let ids = (1..=depth)
        .map(|index| format!("level{index:04}"))
        .collect::<Vec<_>>();
    let mut nodes = vec![serde_json::json!({
        "id": "root",
        "kind": "root",
        "children": ids.first().into_iter().collect::<Vec<_>>(),
    })];
    for (index, id) in ids.iter().enumerate() {
        if index + 1 == ids.len() {
            nodes.push(serde_json::json!({ "id": id, "kind": "content", "content": "End" }));
        } else {
            nodes.push(serde_json::json!({
                "id": id,
                "kind": "group",
                "children": [&ids[index + 1]],
            }));
        }
    }
    serde_json::json!({
        "kind": "a3s.form",
        "apiVersion": "a3s.dev/form/v1alpha1",
        "revision": 1,
        "metadata": { "title": format!("Depth corpus {depth}"), "locale": "en-US" },
        "schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": {},
            "additionalProperties": false,
        },
        "ui": { "root": "root", "nodes": nodes },
        "rules": [],
        "dataSources": [],
        "actions": [],
    })
}

#[test]
fn matches_layout_depth_boundary_cases() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-compiler-depth-conformance/v1"
    );
    assert_eq!(fixture.generator, "linear-layout-v1");
    for case in fixture.cases {
        let request = serde_json::json!({
            "apiVersion": COMPILE_REQUEST_API_VERSION,
            "document": depth_document(case.depth),
            "options": { "limits": { "maxDepth": case.max_depth } },
        });
        let request = serde_json::to_vec(&request).expect("depth request should encode");
        let response = compile_bytes(&request).expect("depth response should encode");
        let response = parse_json(&response).expect("depth response should decode");
        assert_eq!(
            response.get("ok").and_then(CanonicalValue::as_bool),
            Some(case.ok),
            "{}",
            case.name,
        );
        let diagnostics = response
            .get("diagnostics")
            .expect("depth response should contain diagnostics");
        assert_eq!(
            serde_json::to_value(diagnostics).expect("depth diagnostics should encode"),
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
            .expect("successful depth response should contain normalized document");
        assert_eq!(
            Some(canonical_sha256(normalized.as_bytes())),
            case.normalized_document_sha256,
            "{}",
            case.name,
        );
        let plan = response
            .get("formPlan")
            .expect("successful depth response should contain FormPlan");
        let plan = canonicalize_value(plan).expect("depth FormPlan should canonicalize");
        assert_eq!(
            Some(canonical_sha256(&plan)),
            case.form_plan_sha256,
            "{}",
            case.name,
        );
    }
}
