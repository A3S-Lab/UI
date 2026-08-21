use std::fs;
use std::path::PathBuf;

use a3s_form_core::{canonicalize_value, evaluate_bytes, CanonicalValue};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    api_version: String,
    cases: Vec<EvaluationCase>,
}

#[derive(Debug, Deserialize)]
struct EvaluationCase {
    name: String,
    request: CanonicalValue,
    response: CanonicalValue,
}

fn fixture() -> Fixture {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/conformance/value-evaluation-v1.json");
    let bytes = fs::read(&path)
        .unwrap_or_else(|error| panic!("failed to read fixture {}: {error}", path.display()));
    serde_json::from_slice(&bytes)
        .unwrap_or_else(|error| panic!("failed to decode fixture {}: {error}", path.display()))
}

#[test]
fn matches_the_shared_value_evaluation_corpus_byte_for_byte() {
    let fixture = fixture();
    assert_eq!(
        fixture.api_version,
        "a3s.dev/form-value-evaluation-conformance/v1"
    );
    for case in fixture.cases {
        let request = canonicalize_value(&case.request)
            .unwrap_or_else(|error| panic!("{} request failed: {error}", case.name));
        let expected = canonicalize_value(&case.response)
            .unwrap_or_else(|error| panic!("{} response failed: {error}", case.name));
        let actual = evaluate_bytes(&request)
            .unwrap_or_else(|error| panic!("{} evaluation failed: {error}", case.name));
        assert_eq!(actual, expected, "{}", case.name);
    }
}
