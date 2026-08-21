use std::fs;
use std::path::PathBuf;

use a3s_form_core::{
    canonical_sha256, canonicalize_document_for_digest, canonicalize_json, digest_document_json,
    parse_json, CanonicalError,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    api_version: String,
    cases: Vec<CanonicalCase>,
    digest_cases: Vec<DigestCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CanonicalCase {
    name: String,
    input_json: String,
    canonical: String,
    sha256: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DigestCase {
    name: String,
    input_json: String,
    canonical: String,
    sha256: String,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/canonical-json-v1.json");
    let bytes = fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "failed to read canonical fixture {}: {error}",
            path.display()
        )
    });
    serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        panic!(
            "failed to decode canonical fixture {}: {error}",
            path.display()
        )
    })
}

#[test]
fn matches_shared_canonical_json_cases() {
    let fixture = fixture();
    assert_eq!(fixture.api_version, "a3s.dev/form-canonical-conformance/v1");

    for case in fixture.cases {
        let canonical = canonicalize_json(case.input_json.as_bytes())
            .unwrap_or_else(|error| panic!("{} failed to canonicalize: {error}", case.name));
        assert_eq!(canonical, case.canonical.as_bytes(), "{}", case.name);
        assert_eq!(canonical_sha256(&canonical), case.sha256, "{}", case.name);
    }
}

#[test]
fn matches_shared_document_digest_cases() {
    for case in fixture().digest_cases {
        let canonical = canonicalize_document_for_digest(case.input_json.as_bytes())
            .unwrap_or_else(|error| panic!("{} failed to canonicalize: {error}", case.name));
        assert_eq!(canonical, case.canonical.as_bytes(), "{}", case.name);
        assert_eq!(
            digest_document_json(case.input_json.as_bytes())
                .unwrap_or_else(|error| panic!("{} failed to hash: {error}", case.name)),
            case.sha256,
            "{}",
            case.name,
        );
    }
}

#[test]
fn rejects_duplicate_keys_and_non_object_documents() {
    assert!(matches!(
        parse_json(br#"{"same":1,"same":2}"#),
        Err(CanonicalError::InvalidJson { .. })
    ));
    assert!(matches!(
        digest_document_json(br#"[1,2,3]"#),
        Err(CanonicalError::DocumentMustBeObject)
    ));
}
