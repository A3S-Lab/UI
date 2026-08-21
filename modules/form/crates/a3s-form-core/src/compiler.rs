use std::collections::{HashMap, HashSet};

use crate::canonical::{canonicalize_value, CanonicalValue};
use crate::pointer::{get_at_pointer, schema_pointer_to_value_path_template};
use crate::protocol::{
    decode_compile_request, encode_compile_response, CompileResponse, DecodedCompileRequest,
    Diagnostic, DiagnosticSeverity, ProtocolError,
};
use crate::schema::inspect_schema_profile;

mod containers;
mod integrations;
mod matrix;
mod plan;
mod rules;

const FORM_DOCUMENT_API_VERSION: &str = "a3s.dev/form/v1alpha1";

const DEFAULT_WIDGETS: &[&str] = &[
    "text",
    "textarea",
    "number",
    "select",
    "radio",
    "checkbox",
    "switch",
    "date",
    "email",
    "password",
    "url",
    "tel",
    "date-time",
    "time",
    "multi-select",
    "tags",
    "currency",
    "rating",
    "slider",
    "hidden",
    "calculated",
    "matrix-single",
    "matrix-multiple",
];

const SUPPORTED_NODE_KINDS: &[&str] = &["root", "section", "group", "field", "repeater", "content"];
const SUPPORTED_LAYOUTS: &[&str] = &[
    "flow",
    "grid",
    "columns",
    "card",
    "tabs",
    "tab",
    "collapse",
    "collapse-panel",
    "data-grid",
    "wizard",
    "page",
];

#[derive(Clone, Debug)]
struct CompiledNode {
    id: String,
    kind: String,
    children: Vec<String>,
    data_source: Option<String>,
    layout: Option<String>,
    page_role: Option<String>,
    schema: Option<CanonicalValue>,
    value_path: Option<String>,
    value_path_template: Option<String>,
    repeater_ancestors: Vec<String>,
    depth: u64,
}

#[derive(Clone, Debug)]
struct RuleAnalysis {
    dependencies: Vec<(String, Vec<String>)>,
    dependency_order: Vec<String>,
}

/// Compiles one versioned request into canonical response bytes.
///
/// Protocol errors are represented as failed compile responses so native and
/// WASM callers receive the same deterministic envelope.
pub fn compile_bytes(input: &[u8]) -> Result<Vec<u8>, ProtocolError> {
    let response = match decode_compile_request(input) {
        Ok(decoded) => compile_decoded(&decoded),
        Err(error) => CompileResponse::failure(vec![error.diagnostic()]),
    };
    encode_compile_response(&response)
}

fn compile_decoded(decoded: &DecodedCompileRequest) -> CompileResponse {
    let mut diagnostics = Vec::new();
    if !inspect_document_structure(&decoded.request.document, &mut diagnostics) {
        return CompileResponse::failure(diagnostics);
    }

    let document = &decoded.request.document;
    let Some(schema) = document.get("schema") else {
        diagnostics.push(internal_error("Validated document is missing schema."));
        return CompileResponse::failure(diagnostics);
    };
    diagnostics.extend(inspect_schema_profile(schema, "/schema"));
    inspect_digest(
        document,
        decoded.request.options.require_digest,
        &mut diagnostics,
    );

    let Some(source_nodes) = document
        .get("ui")
        .and_then(|ui| ui.get("nodes"))
        .and_then(CanonicalValue::as_array)
    else {
        diagnostics.push(internal_error("Validated document is missing UI nodes."));
        return CompileResponse::failure(diagnostics);
    };
    if source_nodes.len() as u64 > decoded.limits.max_nodes {
        diagnostics.push(error(
            "limits.nodes",
            format!(
                "Node count exceeds the configured limit of {}.",
                decoded.limits.max_nodes
            ),
            "/ui/nodes",
        ));
    }

    let (mut nodes, node_indices) = inspect_nodes(
        document,
        schema,
        source_nodes,
        &decoded.request.options.capabilities.widgets,
        &mut diagnostics,
    );
    containers::inspect_container_semantics(
        source_nodes,
        &mut nodes,
        &node_indices,
        &mut diagnostics,
    );
    integrations::inspect_data_sources(
        document,
        schema,
        &nodes,
        &decoded.request.options.capabilities.data_sources,
        &mut diagnostics,
    );
    integrations::inspect_actions(
        document,
        &decoded.request.options.capabilities.actions,
        &mut diagnostics,
    );
    inspect_layout(
        document,
        &mut nodes,
        &node_indices,
        decoded.limits.max_depth,
        &mut diagnostics,
    );
    let rule_analysis = rules::inspect_rules(
        document,
        schema,
        &nodes,
        &node_indices,
        decoded.limits,
        &mut diagnostics,
    );

    if has_errors(&diagnostics) {
        return CompileResponse::failure(diagnostics);
    }

    let mut normalized = plan::normalize_document(document.clone());
    let digest = match plan::seal_document(&mut normalized) {
        Ok(digest) => digest,
        Err(message) => {
            diagnostics.push(internal_error(message));
            return CompileResponse::failure(diagnostics);
        }
    };
    let normalized_document = match canonicalize_value(&normalized)
        .map_err(|error| error.to_string())
        .and_then(|bytes| String::from_utf8(bytes).map_err(|error| error.to_string()))
    {
        Ok(document) => document,
        Err(message) => {
            diagnostics.push(internal_error(format!(
                "Failed to encode normalized document: {message}"
            )));
            return CompileResponse::failure(diagnostics);
        }
    };
    let plan = plan::build_plan(
        &normalized,
        &nodes,
        &node_indices,
        &rule_analysis,
        decoded.limits.max_expression_operations,
        &digest,
    );
    CompileResponse::success(normalized_document, digest, plan, diagnostics)
}

fn inspect_document_structure(input: &CanonicalValue, diagnostics: &mut Vec<Diagnostic>) -> bool {
    if input.as_object().is_none() {
        diagnostics.push(error(
            "document.type",
            "Form document must be a JSON object.",
            "",
        ));
        return false;
    }
    if input.get("kind").and_then(CanonicalValue::as_str) != Some("a3s.form") {
        diagnostics.push(error("document.kind", "kind must be a3s.form.", "/kind"));
    }
    if input.get("apiVersion").and_then(CanonicalValue::as_str) != Some(FORM_DOCUMENT_API_VERSION) {
        diagnostics.push(error_with_hint(
            "document.api_version",
            "Unsupported Form document apiVersion.",
            "/apiVersion",
            format!("Use {FORM_DOCUMENT_API_VERSION}."),
        ));
    }
    if input
        .get("schema")
        .and_then(CanonicalValue::as_object)
        .is_none()
    {
        diagnostics.push(error(
            "schema.type",
            "schema must be a JSON Schema object.",
            "/schema",
        ));
    }
    match input.get("ui") {
        Some(ui) if ui.as_object().is_some() => {
            if ui.get("root").and_then(CanonicalValue::as_str).is_none() {
                diagnostics.push(error(
                    "ui.root",
                    "ui.root must reference a root node ID.",
                    "/ui/root",
                ));
            }
            if ui.get("nodes").and_then(CanonicalValue::as_array).is_none() {
                diagnostics.push(error("ui.nodes", "ui.nodes must be an array.", "/ui/nodes"));
            }
        }
        _ => diagnostics.push(error("ui.type", "ui must be an object.", "/ui")),
    }
    if input
        .get("metadata")
        .and_then(|metadata| metadata.get("title"))
        .and_then(CanonicalValue::as_str)
        .is_none()
    {
        diagnostics.push(error(
            "metadata.title",
            "metadata.title must be a string.",
            "/metadata/title",
        ));
    }
    if !input
        .get("revision")
        .is_some_and(is_non_negative_safe_integer)
    {
        diagnostics.push(error(
            "document.revision",
            "revision must be a non-negative safe integer.",
            "/revision",
        ));
    }
    for (field, code) in [
        ("rules", "rules.type"),
        ("dataSources", "data_source.type"),
        ("actions", "action.type"),
    ] {
        if input
            .get(field)
            .is_some_and(|value| value.as_array().is_none())
        {
            diagnostics.push(error(
                code,
                format!("{field} must be an array when present."),
                format!("/{field}"),
            ));
        }
    }
    !has_errors(diagnostics)
}

fn inspect_digest(
    document: &CanonicalValue,
    require_digest: bool,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let digest = document.get("digest").and_then(CanonicalValue::as_str);
    if require_digest && digest.is_none_or(str::is_empty) {
        diagnostics.push(error(
            "digest.required",
            "Published forms must contain a digest.",
            "/digest",
        ));
    }
    if let Some(actual) = digest.filter(|digest| !digest.is_empty()) {
        match plan::document_digest(document) {
            Ok(expected) if actual != expected => diagnostics.push(error_with_hint(
                "digest.mismatch",
                "digest does not match the current document content.",
                "/digest",
                "Seal the document again before publishing.",
            )),
            Ok(_) => {}
            Err(message) => diagnostics.push(internal_error(message)),
        }
    } else if document.get("digest").is_some() && digest.is_none() {
        diagnostics.push(error(
            "digest.mismatch",
            "digest must be a sha256 string when present.",
            "/digest",
        ));
    }
}

fn inspect_nodes(
    document: &CanonicalValue,
    schema_root: &CanonicalValue,
    source_nodes: &[CanonicalValue],
    custom_widgets: &[String],
    diagnostics: &mut Vec<Diagnostic>,
) -> (Vec<CompiledNode>, HashMap<String, usize>) {
    let mut nodes = Vec::new();
    let mut indices = HashMap::new();
    for (source_index, source) in source_nodes.iter().enumerate() {
        let path = format!("/ui/nodes/{source_index}");
        let Some(id) = source.get("id").and_then(CanonicalValue::as_str) else {
            diagnostics.push(error(
                "node.id",
                "Every node must have a non-empty id.",
                format!("{path}/id"),
            ));
            continue;
        };
        if id.trim().is_empty() {
            diagnostics.push(error(
                "node.id",
                "Every node must have a non-empty id.",
                format!("{path}/id"),
            ));
            continue;
        }
        if indices.contains_key(id) {
            diagnostics.push(error(
                "node.duplicate",
                format!("Node ID {id} is duplicated."),
                format!("{path}/id"),
            ));
            continue;
        }
        let Some(kind) = source.get("kind").and_then(CanonicalValue::as_str) else {
            diagnostics.push(error(
                "node.kind",
                format!("Node {id} has an unsupported kind."),
                format!("{path}/kind"),
            ));
            continue;
        };
        if !SUPPORTED_NODE_KINDS.contains(&kind) {
            diagnostics.push(error(
                "node.kind",
                format!("Node {id} has an unsupported kind."),
                format!("{path}/kind"),
            ));
            continue;
        }
        if source.get("layout").is_some_and(|layout| {
            !layout
                .as_str()
                .is_some_and(|layout| SUPPORTED_LAYOUTS.contains(&layout))
        }) {
            diagnostics.push(error(
                "node.layout",
                format!("Node {id} uses an unsupported layout."),
                format!("{path}/layout"),
            ));
        }
        if source.get("pageRole").is_some_and(|role| {
            !role
                .as_str()
                .is_some_and(|role| ["form", "review"].contains(&role))
        }) {
            diagnostics.push(error(
                "wizard.page_role",
                format!("Node {id} uses an unsupported wizard page role."),
                format!("{path}/pageRole"),
            ));
        }
        let children = inspect_children(source, &path, diagnostics);
        let mut resolved_schema = None;
        let mut value_path_template = None;
        if kind == "field" || kind == "repeater" {
            match source.get("schemaPath").and_then(CanonicalValue::as_str) {
                None => diagnostics.push(error(
                    "node.schema_path",
                    format!("Node {id} is missing schemaPath."),
                    format!("{path}/schemaPath"),
                )),
                Some(pointer) => match (
                    get_at_pointer(schema_root, pointer),
                    schema_pointer_to_value_path_template(pointer),
                ) {
                    (Ok(Some(schema)), Ok(Some(template))) if schema.as_object().is_some() => {
                        resolved_schema = Some(schema.clone());
                        value_path_template = Some(template);
                    }
                    (Err(_), _) | (_, Err(_)) => diagnostics.push(error(
                        "node.schema_reference",
                        format!("Node {id} schemaPath is not a valid JSON Pointer."),
                        format!("{path}/schemaPath"),
                    )),
                    _ => diagnostics.push(error(
                        "node.schema_reference",
                        format!("Node {id} schemaPath does not resolve to a value schema."),
                        format!("{path}/schemaPath"),
                    )),
                },
            }
        }
        let value_path = value_path_template
            .as_ref()
            .filter(|template| !template.contains('*'))
            .cloned();
        let index = nodes.len();
        indices.insert(id.to_owned(), index);
        nodes.push(CompiledNode {
            id: id.to_owned(),
            kind: kind.to_owned(),
            children,
            data_source: source
                .get("dataSource")
                .and_then(CanonicalValue::as_str)
                .map(str::to_owned),
            layout: source
                .get("layout")
                .and_then(CanonicalValue::as_str)
                .map(str::to_owned),
            page_role: source
                .get("pageRole")
                .and_then(CanonicalValue::as_str)
                .map(str::to_owned),
            schema: resolved_schema,
            value_path,
            value_path_template,
            repeater_ancestors: Vec::new(),
            depth: 0,
        });
    }

    let root = document
        .get("ui")
        .and_then(|ui| ui.get("root"))
        .and_then(CanonicalValue::as_str);
    if root.is_some_and(|root| !indices.contains_key(root)) {
        diagnostics.push(error(
            "ui.root_reference",
            "ui.root references a node that does not exist.",
            "/ui/root",
        ));
    }
    inspect_node_references(
        document,
        source_nodes,
        &nodes,
        &indices,
        custom_widgets,
        diagnostics,
    );
    (nodes, indices)
}

fn inspect_children(
    source: &CanonicalValue,
    path: &str,
    diagnostics: &mut Vec<Diagnostic>,
) -> Vec<String> {
    match source.get("children") {
        None => Vec::new(),
        Some(CanonicalValue::Array(children)) => children
            .iter()
            .enumerate()
            .filter_map(|(index, child)| match child.as_str() {
                Some(child) => Some(child.to_owned()),
                None => {
                    diagnostics.push(error(
                        "node.child",
                        "Node child references must be strings.",
                        format!("{path}/children/{index}"),
                    ));
                    None
                }
            })
            .collect(),
        Some(_) => {
            diagnostics.push(error(
                "node.children",
                "Node children must be an array.",
                format!("{path}/children"),
            ));
            Vec::new()
        }
    }
}

fn inspect_node_references(
    document: &CanonicalValue,
    source_nodes: &[CanonicalValue],
    nodes: &[CompiledNode],
    indices: &HashMap<String, usize>,
    custom_widgets: &[String],
    diagnostics: &mut Vec<Diagnostic>,
) {
    let mut widgets = DEFAULT_WIDGETS
        .iter()
        .map(|widget| (*widget).to_owned())
        .collect::<HashSet<_>>();
    widgets.extend(custom_widgets.iter().cloned());
    let data_source_ids = document
        .get("dataSources")
        .and_then(CanonicalValue::as_array)
        .unwrap_or_default()
        .iter()
        .filter_map(|source| source.get("id").and_then(CanonicalValue::as_str))
        .collect::<HashSet<_>>();

    for (source_index, source) in source_nodes.iter().enumerate() {
        if source.as_object().is_none() {
            continue;
        }
        let path = format!("/ui/nodes/{source_index}");
        matrix::inspect_matrix_node(
            source,
            source_index,
            source
                .get("id")
                .and_then(CanonicalValue::as_str)
                .and_then(|id| indices.get(id))
                .map(|index| &nodes[*index]),
            diagnostics,
        );
        let Some(id) = source.get("id").and_then(CanonicalValue::as_str) else {
            continue;
        };
        if let Some(widget) = source.get("widget").and_then(CanonicalValue::as_str) {
            if !widgets.contains(widget) {
                diagnostics.push(error(
                    "capability.widget",
                    format!("Widget {widget} is not registered."),
                    format!("{path}/widget"),
                ));
            }
        }
        if let Some(data_source) = source.get("dataSource").and_then(CanonicalValue::as_str) {
            if !data_source_ids.contains(data_source) {
                diagnostics.push(error(
                    "node.data_source",
                    format!("Node {id} references an unknown data source."),
                    format!("{path}/dataSource"),
                ));
            }
        }
        if let Some(node_index) = indices.get(id) {
            for child in &nodes[*node_index].children {
                if !indices.contains_key(child) {
                    diagnostics.push(error(
                        "node.child_reference",
                        format!("Child node {child} does not exist."),
                        format!("{path}/children"),
                    ));
                }
            }
        }
    }
}

fn inspect_layout(
    document: &CanonicalValue,
    nodes: &mut [CompiledNode],
    indices: &HashMap<String, usize>,
    max_depth: u64,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let Some(root) = document
        .get("ui")
        .and_then(|ui| ui.get("root"))
        .and_then(CanonicalValue::as_str)
    else {
        return;
    };
    let mut visiting = HashSet::new();
    let mut reached = HashSet::new();
    walk_layout(
        root,
        0,
        nodes,
        indices,
        max_depth,
        &mut visiting,
        &mut reached,
        diagnostics,
    );
    for node in nodes {
        if !reached.contains(node.id.as_str()) {
            diagnostics.push(warning(
                "layout.unreachable",
                format!("Node {} is not reachable from the root layout.", node.id),
                "/ui/nodes",
            ));
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn walk_layout(
    id: &str,
    depth: u64,
    nodes: &mut [CompiledNode],
    indices: &HashMap<String, usize>,
    max_depth: u64,
    visiting: &mut HashSet<String>,
    reached: &mut HashSet<String>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if visiting.contains(id) {
        diagnostics.push(error(
            "layout.cycle",
            format!("Layout node {id} forms a cycle."),
            "/ui/nodes",
        ));
        return;
    }
    let Some(index) = indices.get(id).copied() else {
        return;
    };
    if depth > max_depth {
        diagnostics.push(error(
            "limits.depth",
            format!("Layout depth exceeds the configured limit of {max_depth}."),
            "/ui/nodes",
        ));
        return;
    }
    nodes[index].depth = nodes[index].depth.max(depth);
    let children = nodes[index].children.clone();
    reached.insert(id.to_owned());
    visiting.insert(id.to_owned());
    for child in children {
        walk_layout(
            &child,
            depth + 1,
            nodes,
            indices,
            max_depth,
            visiting,
            reached,
            diagnostics,
        );
    }
    visiting.remove(id);
}

fn schema_has_value_path(schema: &CanonicalValue, path: &str) -> bool {
    let mut current = schema;
    for segment in path.split('.') {
        if segment == "*" {
            if current.get("type").and_then(CanonicalValue::as_str) != Some("array") {
                return false;
            }
            let Some(items) = current.get("items") else {
                return false;
            };
            current = items;
        } else {
            let Some(child) = current
                .get("properties")
                .and_then(|properties| properties.get(segment))
            else {
                return false;
            };
            current = child;
        }
    }
    true
}

fn is_non_negative_safe_integer(value: &CanonicalValue) -> bool {
    value.as_f64().is_some_and(|value| {
        value >= 0.0 && value.fract() == 0.0 && value <= 9_007_199_254_740_991.0
    })
}

fn sort_utf16(values: &mut [String]) {
    values.sort_by(|left, right| left.encode_utf16().cmp(right.encode_utf16()));
}

fn pointer_token(value: &str) -> String {
    value.replace('~', "~0").replace('/', "~1")
}

fn has_errors(diagnostics: &[Diagnostic]) -> bool {
    diagnostics
        .iter()
        .any(|diagnostic| diagnostic.severity == DiagnosticSeverity::Error)
}

fn error(
    code: impl Into<String>,
    message: impl Into<String>,
    path: impl Into<String>,
) -> Diagnostic {
    Diagnostic::error(code, message, path)
}

fn error_with_hint(
    code: impl Into<String>,
    message: impl Into<String>,
    path: impl Into<String>,
    hint: impl Into<String>,
) -> Diagnostic {
    let mut diagnostic = error(code, message, path);
    diagnostic.hint = Some(hint.into());
    diagnostic
}

fn warning(
    code: impl Into<String>,
    message: impl Into<String>,
    path: impl Into<String>,
) -> Diagnostic {
    Diagnostic {
        code: code.into(),
        severity: DiagnosticSeverity::Warning,
        message: message.into(),
        path: path.into(),
        hint: None,
    }
}

fn internal_error(message: impl Into<String>) -> Diagnostic {
    error("compiler.internal", message, "")
}
