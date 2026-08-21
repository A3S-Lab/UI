use std::io::Write;
use std::process::{Command, Stdio};

fn run(command: &str, input: &[u8]) -> std::process::Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_a3s-form-core"))
        .arg(command)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("CLI should start");
    child
        .stdin
        .take()
        .expect("CLI stdin should be available")
        .write_all(input)
        .expect("fixture should write");
    child.wait_with_output().expect("CLI should finish")
}

#[test]
fn canonicalizes_from_standard_input() {
    let output = run("canonicalize", br#"{"z":1,"a":true}"#);
    assert!(output.status.success());
    assert_eq!(output.stdout, br#"{"a":true,"z":1}"#);
    assert!(output.stderr.is_empty());
}

#[test]
fn computes_document_digest_from_standard_input() {
    let output = run("digest-document", br#"{"a":true,"digest":"stale"}"#);
    assert!(output.status.success());
    assert_eq!(
        output.stdout,
        b"sha256:5daa0644c4a1c43ea018f7f1ef2944b90e0165ef1f2d5669ca89e5d4f69ac597\n"
    );
}

#[test]
fn compiles_a_versioned_request_from_standard_input() {
    let output = run(
        "compile",
        br#"{"apiVersion":"a3s.dev/form-core/compile-request/v1alpha1","document":{"kind":"a3s.form","apiVersion":"a3s.dev/form/v1alpha1","revision":1,"metadata":{"title":"CLI"},"schema":{"type":"object"},"ui":{"root":"root","nodes":[{"id":"root","kind":"root"}]}}}"#,
    );
    assert!(output.status.success());
    let response: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("compile response should be JSON");
    assert_eq!(
        response.get("ok").and_then(serde_json::Value::as_bool),
        Some(true)
    );
}

#[test]
fn evaluates_a_versioned_request_from_standard_input() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../tests/conformance/value-evaluation-v1.json"
    ))
    .expect("evaluation fixture should decode");
    let case = &fixture["cases"][0];
    let request = serde_json::to_vec(&case["request"]).expect("request should encode");
    let output = run("evaluate", &request);
    assert!(output.status.success());
    let response: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("evaluation response should be JSON");
    assert_eq!(response, case["response"]);
}
