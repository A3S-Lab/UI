use a3s_form_core::{
    decode_compile_request, encode_compile_response, CanonicalValue, CompileResponse, Diagnostic,
    ProtocolError, COMPILER_REVISION, COMPILE_REQUEST_API_VERSION, COMPILE_RESPONSE_API_VERSION,
};

#[test]
fn decodes_a_bounded_versioned_request() {
    let input = format!(
        r#"{{"apiVersion":"{COMPILE_REQUEST_API_VERSION}","document":{{"z":1,"a":true}},"options":{{"requireDigest":true,"capabilities":{{"widgets":["text"]}}}}}}"#,
    );
    let decoded = decode_compile_request(input.as_bytes()).expect("request should decode");

    assert_eq!(decoded.canonical_document, br#"{"a":true,"z":1}"#);
    assert!(decoded.request.options.require_digest);
    assert_eq!(decoded.request.options.capabilities.widgets, ["text"]);
    assert_eq!(decoded.limits.max_nodes, 1_000);
}

#[test]
fn rejects_unsupported_versions_and_unbounded_documents() {
    let unsupported = br#"{"apiVersion":"unsupported","document":{}}"#;
    assert!(matches!(
        decode_compile_request(unsupported),
        Err(ProtocolError::UnsupportedApiVersion { .. })
    ));

    let too_large = format!(
        r#"{{"apiVersion":"{COMPILE_REQUEST_API_VERSION}","document":{{"value":"oversized"}},"options":{{"limits":{{"maxSerializedBytes":1}}}}}}"#,
    );
    assert!(matches!(
        decode_compile_request(too_large.as_bytes()),
        Err(ProtocolError::DocumentTooLarge { .. })
    ));
}

#[test]
fn encodes_compile_responses_as_canonical_json() {
    let response = CompileResponse::success(
        r#"{"a":true}"#.to_owned(),
        "sha256:test".to_owned(),
        CanonicalValue::Object(vec![
            ("sourceRevision".to_owned(), CanonicalValue::Number(1.0)),
            (
                "apiVersion".to_owned(),
                CanonicalValue::String("a3s.dev/form-plan/v1alpha1".to_owned()),
            ),
        ]),
        vec![],
    );
    let encoded = encode_compile_response(&response).expect("response should encode");
    let text = String::from_utf8(encoded).expect("response should be UTF-8");

    assert!(text.starts_with("{\"apiVersion\":"));
    assert!(text.contains(&format!("\"compilerRevision\":\"{COMPILER_REVISION}\"")));
    assert!(text.contains(&format!(
        "\"apiVersion\":\"{COMPILE_RESPONSE_API_VERSION}\""
    )));

    let failure = CompileResponse::failure(vec![Diagnostic::error(
        "document.kind",
        "kind must be a3s.form",
        "/kind",
    )]);
    let failure_text = String::from_utf8(
        encode_compile_response(&failure).expect("failure response should encode"),
    )
    .expect("response should be UTF-8");
    assert!(failure_text.contains("\"ok\":false"));
    assert!(failure_text.contains("\"severity\":\"error\""));
}
