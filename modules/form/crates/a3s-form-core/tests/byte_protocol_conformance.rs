use std::fs;
use std::path::PathBuf;

use a3s_form_core::{compile_bytes, ABSOLUTE_MAX_REQUEST_BYTES};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    api_version: String,
    cases: Vec<ProtocolCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProtocolCase {
    name: String,
    request_json: String,
    response_json: String,
}

fn fixture() -> Fixture {
    let path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/conformance/protocol-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read protocol fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode protocol fixture {}: {error}",
            path.display()
        )
    })
}

#[test]
fn matches_byte_protocol_failure_responses() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-core-protocol-conformance/v1"
    );
    for case in fixture.cases {
        let response = compile_bytes(case.request_json.as_bytes())
            .unwrap_or_else(|error| panic!("{} failed to compile: {error}", case.name));
        assert_eq!(response, case.response_json.as_bytes(), "{}", case.name);
    }
}

#[test]
fn reports_requests_beyond_the_absolute_boundary() {
    let request = vec![0; ABSOLUTE_MAX_REQUEST_BYTES + 1];
    let response = compile_bytes(&request).expect("oversized response should encode");
    assert_eq!(
        response,
        br#"{"apiVersion":"a3s.dev/form-core/compile-response/v1alpha1","compilerRevision":"a3s-form-core@0.1.0","diagnostics":[{"code":"protocol.request_size","message":"compile request is 5242881 bytes; the hard limit is 5242880 bytes","path":"","severity":"error"}],"ok":false}"#,
    );
}
