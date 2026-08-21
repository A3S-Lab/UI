use std::fs;
use std::path::PathBuf;

use a3s_form_core::{
    canonicalize_interaction_request_content, canonicalize_interaction_value,
    decode_interaction_request, decode_interaction_submission, digest_interaction_request,
    digest_interaction_value, FormInteractionRequest, FormInteractionSubmission,
    FORM_INTERACTION_REQUEST_API_VERSION, FORM_INTERACTION_SUBMISSION_API_VERSION,
    FORM_RELEASE_REF_API_VERSION,
};
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Fixture {
    api_version: String,
    request_content_canonical: String,
    request_digest: String,
    value_canonical: String,
    value_digest: String,
    request: FormInteractionRequest,
    submission: FormInteractionSubmission,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/interaction-contract-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read interaction fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode interaction fixture {}: {error}",
            path.display()
        )
    })
}

#[test]
fn matches_shared_interaction_contract_and_digests() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-interaction-conformance/v1"
    );
    assert_eq!(
        fixture.request.api_version,
        FORM_INTERACTION_REQUEST_API_VERSION
    );
    assert_eq!(
        fixture.request.form.api_version,
        FORM_RELEASE_REF_API_VERSION
    );
    assert_eq!(
        fixture.submission.api_version,
        FORM_INTERACTION_SUBMISSION_API_VERSION
    );

    fixture
        .request
        .form
        .validate()
        .expect("Form release reference should validate independently");
    fixture.request.validate().expect("request should validate");
    fixture
        .submission
        .validate()
        .expect("submission should validate");
    assert_eq!(
        canonicalize_interaction_request_content(&fixture.request)
            .expect("request should canonicalize"),
        fixture.request_content_canonical.as_bytes()
    );
    assert_eq!(
        digest_interaction_request(&fixture.request).expect("request should hash"),
        fixture.request_digest
    );
    assert_eq!(
        canonicalize_interaction_value(&fixture.submission.value)
            .expect("value should canonicalize"),
        fixture.value_canonical.as_bytes()
    );
    assert_eq!(
        digest_interaction_value(&fixture.submission.value).expect("value should hash"),
        fixture.value_digest
    );

    let request_json = serde_json::to_vec(&fixture.request).expect("request should encode");
    assert_eq!(
        decode_interaction_request(&request_json).expect("request should decode"),
        fixture.request
    );
    let submission_json =
        serde_json::to_vec(&fixture.submission).expect("submission should encode");
    assert_eq!(
        decode_interaction_submission(&submission_json).expect("submission should decode"),
        fixture.submission
    );
}

#[test]
fn validates_standalone_form_release_references() {
    let fixture = fixture();
    let mut form = fixture.request.form;

    form.validate()
        .expect("Form release reference should validate");
    form.api_version = "unsupported".to_owned();
    assert!(form.validate().is_err());
}

#[test]
fn rejects_unknown_fields_versions_and_digest_drift() {
    let fixture = fixture();
    let mut request = serde_json::to_value(&fixture.request).expect("request should encode");
    request
        .as_object_mut()
        .expect("request should be an object")
        .insert("unknown".to_owned(), Value::Bool(true));
    assert!(decode_interaction_request(
        &serde_json::to_vec(&request).expect("request mutation should encode")
    )
    .is_err());

    let mut request = fixture.request.clone();
    request.api_version = "unsupported".to_owned();
    assert!(request.validate().is_err());
    request.api_version = FORM_INTERACTION_REQUEST_API_VERSION.to_owned();
    request.digest = format!("sha256:{}", "0".repeat(64));
    assert!(request.validate().is_err());

    let mut submission = fixture.submission;
    submission.value_digest = format!("sha256:{}", "0".repeat(64));
    assert!(submission.validate().is_err());
}
