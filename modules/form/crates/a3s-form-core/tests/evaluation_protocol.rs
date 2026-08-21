use a3s_form_core::{evaluate_bytes, EVALUATE_REQUEST_API_VERSION, EVALUATE_RESPONSE_API_VERSION};

fn request(api_version: &str) -> Vec<u8> {
    format!(
        r#"{{
          "apiVersion":"{api_version}",
          "formPlan":{{
            "apiVersion":"a3s.dev/form-plan/v1alpha1",
            "schemaProfile":"a3s.dev/form-schema-profile/1",
            "metadata":{{"locale":"en-US"}},
            "schema":{{
              "type":"object",
              "properties":{{
                "quantity":{{"type":"number"}},
                "unitPrice":{{"type":"number"}},
                "total":{{"type":"number"}}
              }},
              "required":["total"],
              "additionalProperties":false
            }},
            "nodes":[
              {{"id":"total","kind":"field","valuePath":"total","depth":1}}
            ],
            "nodeById":{{
              "total":{{"id":"total","kind":"field","valuePath":"total","depth":1}}
            }},
            "rules":[{{
              "id":"derive-total",
              "target":"total",
              "kind":"computed",
              "expression":{{
                "op":"multiply",
                "left":{{"op":"field","path":"quantity"}},
                "right":{{"op":"field","path":"unitPrice"}}
              }}
            }}],
            "ruleDependencies":{{"derive-total":["quantity","unitPrice"]}},
            "expressionOperationLimit":256,
            "dependencyOrder":["total"]
          }},
          "value":{{"quantity":2,"unitPrice":4,"extra":true}},
          "options":{{"includeValues":true}}
        }}"#,
    )
    .into_bytes()
}

fn expression_request(expression: &str, operation_limit: u64) -> Vec<u8> {
    format!(
        r#"{{
          "apiVersion":"{EVALUATE_REQUEST_API_VERSION}",
          "formPlan":{{
            "apiVersion":"a3s.dev/form-plan/v1alpha1",
            "schemaProfile":"a3s.dev/form-schema-profile/1",
            "metadata":{{"locale":"en-US"}},
            "schema":{{"type":"object"}},
            "nodes":[{{"id":"result","kind":"field","valuePath":"result","depth":1}}],
            "nodeById":{{"result":{{"id":"result","kind":"field","valuePath":"result","depth":1}}}},
            "rules":[{{
              "id":"derive-result",
              "target":"result",
              "kind":"computed",
              "expression":{expression}
            }}],
            "ruleDependencies":{{"derive-result":[]}},
            "expressionOperationLimit":{operation_limit},
            "dependencyOrder":["result"]
          }},
          "value":{{"result":"stale"}},
          "options":{{"includeValues":true}}
        }}"#,
    )
    .into_bytes()
}

#[test]
fn evaluates_computed_values_and_schema_errors_as_canonical_bytes() {
    let response = evaluate_bytes(&request(EVALUATE_REQUEST_API_VERSION))
        .expect("evaluation response should encode");
    assert_eq!(
        response,
        format!(
            r#"{{"apiVersion":"{EVALUATE_RESPONSE_API_VERSION}","compilerRevision":"a3s-form-core@0.1.0","errors":[{{"code":"additionalProperties","message":"Additional properties are not allowed.","path":"extra"}}],"ok":false,"trace":[{{"dependencies":["quantity","unitPrice"],"nextValue":8,"path":"total","ruleId":"derive-total","status":"set","target":"total"}}],"value":{{"extra":true,"quantity":2,"total":8,"unitPrice":4}}}}"#,
        )
        .as_bytes(),
    );
}

#[test]
fn returns_a_versioned_failure_for_an_unsupported_request() {
    let response = evaluate_bytes(&request("unsupported")).expect("failure should encode");
    let text = String::from_utf8(response).expect("response should be UTF-8");
    assert!(text.contains(&format!(
        r#""apiVersion":"{EVALUATE_RESPONSE_API_VERSION}""#
    )));
    assert!(text.contains(r#""code":"protocol.api_version""#));
    assert!(text.contains(r#""ok":false"#));
    assert!(!text.contains(r#""value":"#));
}

#[test]
fn preserves_deterministic_expression_failures() {
    let cases = [
        (
            r#"{"op":"divide","left":{"op":"literal","value":1},"right":{"op":"literal","value":0}}"#,
            256,
            "RangeError: Expression cannot divide by zero.",
        ),
        (
            r#"{"op":"add","left":{"op":"literal","value":1},"right":{"op":"literal","value":2}}"#,
            2,
            "Error: Expression operation limit exceeded (2).",
        ),
        (
            r#"{"op":"concat","values":[{"op":"literal","value":{"sensitive":false}}]}"#,
            256,
            "TypeError: Expression concat values must be JSON primitives.",
        ),
        (
            r#"{"op":"multiply","left":{"op":"literal","value":1.7976931348623157e308},"right":{"op":"literal","value":1.7976931348623157e308}}"#,
            256,
            "RangeError: Expression multiply result must be a finite number.",
        ),
    ];
    for (expression, limit, expected) in cases {
        let response = evaluate_bytes(&expression_request(expression, limit))
            .expect("failure response should encode");
        let response: serde_json::Value =
            serde_json::from_slice(&response).expect("response should decode");
        assert_eq!(response["errors"][0]["message"], expected);
        assert_eq!(response["trace"][0]["error"], expected);
        assert_eq!(response["trace"][0]["previousValue"], "stale");
        assert!(response["value"].get("result").is_none());
    }
}

#[test]
fn rejects_invalid_plans_values_and_oversized_requests_without_trapping() {
    let invalid_plan =
        br#"{"apiVersion":"a3s.dev/form-core/evaluate-request/v1alpha1","formPlan":[],"value":{}}"#;
    let response = evaluate_bytes(invalid_plan).expect("invalid plan response should encode");
    let response: serde_json::Value =
        serde_json::from_slice(&response).expect("response should decode");
    assert_eq!(response["errors"][0]["code"], "protocol.form_plan");

    let invalid_value = String::from_utf8(request(EVALUATE_REQUEST_API_VERSION))
        .expect("request should be UTF-8")
        .replace(
            r#""value":{"quantity":2,"unitPrice":4,"extra":true}"#,
            r#""value":[]"#,
        );
    let response = evaluate_bytes(invalid_value.as_bytes()).expect("invalid value should encode");
    let response: serde_json::Value =
        serde_json::from_slice(&response).expect("response should decode");
    assert_eq!(response["errors"][0]["code"], "protocol.value");

    let oversized = vec![0; a3s_form_core::ABSOLUTE_MAX_REQUEST_BYTES + 1];
    let response = evaluate_bytes(&oversized).expect("oversized response should encode");
    let response: serde_json::Value =
        serde_json::from_slice(&response).expect("response should decode");
    assert_eq!(response["errors"][0]["code"], "protocol.request_size");

    let mut invalid_catalog: serde_json::Value =
        serde_json::from_slice(&request(EVALUATE_REQUEST_API_VERSION))
            .expect("request should decode");
    invalid_catalog["options"] = serde_json::json!({
        "localeCatalog": {
            "apiVersion": "unsupported",
            "messages": {}
        }
    });
    let response = evaluate_bytes(
        &serde_json::to_vec(&invalid_catalog).expect("invalid catalog request should encode"),
    )
    .expect("invalid catalog response should encode");
    let response: serde_json::Value =
        serde_json::from_slice(&response).expect("response should decode");
    assert_eq!(response["errors"][0]["code"], "protocol.locale_catalog");
}

#[test]
fn returns_a_small_failure_envelope_when_the_evaluated_response_is_too_large() {
    let input = "x".repeat(2 * 1024 * 1024);
    let expression = |path: &str| {
        serde_json::json!({
            "op": "concat",
            "values": [
                { "op": "field", "path": path },
                { "op": "field", "path": path }
            ]
        })
    };
    let nodes = ["source", "doubled", "quadrupled", "octupled"]
        .into_iter()
        .map(|id| {
            serde_json::json!({
                "id": id,
                "kind": "field",
                "valuePath": id,
                "depth": 1
            })
        })
        .collect::<Vec<_>>();
    let node_by_id = nodes
        .iter()
        .map(|node| {
            (
                node["id"].as_str().expect("node ID").to_owned(),
                node.clone(),
            )
        })
        .collect::<serde_json::Map<_, _>>();
    let request = serde_json::json!({
        "apiVersion": EVALUATE_REQUEST_API_VERSION,
        "formPlan": {
            "apiVersion": "a3s.dev/form-plan/v1alpha1",
            "schemaProfile": "a3s.dev/form-schema-profile/1",
            "metadata": { "locale": "en-US" },
            "schema": { "type": "object" },
            "nodes": nodes,
            "nodeById": node_by_id,
            "rules": [
                {
                    "id": "double",
                    "target": "doubled",
                    "kind": "computed",
                    "expression": expression("source")
                },
                {
                    "id": "quadruple",
                    "target": "quadrupled",
                    "kind": "computed",
                    "expression": expression("doubled")
                },
                {
                    "id": "octuple",
                    "target": "octupled",
                    "kind": "computed",
                    "expression": expression("quadrupled")
                }
            ],
            "ruleDependencies": {
                "double": ["source"],
                "quadruple": ["doubled"],
                "octuple": ["quadrupled"]
            },
            "expressionOperationLimit": 256,
            "dependencyOrder": ["doubled", "quadrupled", "octupled"]
        },
        "value": { "source": input }
    });
    let request = serde_json::to_vec(&request).expect("large evaluation request should encode");
    assert!(request.len() < a3s_form_core::ABSOLUTE_MAX_REQUEST_BYTES);

    let response = evaluate_bytes(&request).expect("fallback response should encode");
    assert!(response.len() < 1024);
    let response: serde_json::Value =
        serde_json::from_slice(&response).expect("fallback response should decode");
    assert_eq!(response["ok"], false);
    assert_eq!(response["errors"][0]["code"], "protocol.response_encoding");
    assert!(response.get("value").is_none());
}
