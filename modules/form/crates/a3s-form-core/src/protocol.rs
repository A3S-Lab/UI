use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::canonical::{
    canonicalize_json_with_limit, canonicalize_value, CanonicalError, CanonicalValue,
};

pub const COMPILE_REQUEST_API_VERSION: &str = "a3s.dev/form-core/compile-request/v1alpha1";
pub const COMPILE_RESPONSE_API_VERSION: &str = "a3s.dev/form-core/compile-response/v1alpha1";
pub const FORM_SCHEMA_PROFILE_1: &str = "a3s.dev/form-schema-profile/1";
pub const COMPILER_REVISION: &str = concat!("a3s-form-core@", env!("CARGO_PKG_VERSION"));

pub const ABSOLUTE_MAX_DOCUMENT_BYTES: u64 = 4 * 1024 * 1024;
pub const ABSOLUTE_MAX_REQUEST_BYTES: usize = 5 * 1024 * 1024;
pub const ABSOLUTE_MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

const ABSOLUTE_MAX_NODES: u64 = 10_000;
const ABSOLUTE_MAX_DEPTH: u64 = 256;
const ABSOLUTE_MAX_RULES: u64 = 10_000;
const ABSOLUTE_MAX_EXPRESSION_OPERATIONS: u64 = 16_384;
const ABSOLUTE_MAX_PATCH_OPERATIONS: u64 = 16_384;
const MAX_CAPABILITIES_PER_KIND: usize = 4_096;
const MAX_CAPABILITY_KEY_BYTES: usize = 512;

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompilerCapabilities {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub widgets: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub data_sources: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub actions: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompilerLimitOverrides {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_serialized_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_nodes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_depth: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_rules: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_expression_operations: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_patch_operations: Option<u64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerLimits {
    pub max_serialized_bytes: u64,
    pub max_nodes: u64,
    pub max_depth: u64,
    pub max_rules: u64,
    pub max_expression_operations: u64,
    pub max_patch_operations: u64,
}

impl Default for CompilerLimits {
    fn default() -> Self {
        Self {
            max_serialized_bytes: 1_000_000,
            max_nodes: 1_000,
            max_depth: 32,
            max_rules: 1_000,
            max_expression_operations: 256,
            max_patch_operations: 256,
        }
    }
}

impl CompilerLimits {
    fn resolve(overrides: &CompilerLimitOverrides) -> Result<Self, ProtocolError> {
        let defaults = Self::default();
        let resolved = Self {
            max_serialized_bytes: overrides
                .max_serialized_bytes
                .unwrap_or(defaults.max_serialized_bytes),
            max_nodes: overrides.max_nodes.unwrap_or(defaults.max_nodes),
            max_depth: overrides.max_depth.unwrap_or(defaults.max_depth),
            max_rules: overrides.max_rules.unwrap_or(defaults.max_rules),
            max_expression_operations: overrides
                .max_expression_operations
                .unwrap_or(defaults.max_expression_operations),
            max_patch_operations: overrides
                .max_patch_operations
                .unwrap_or(defaults.max_patch_operations),
        };
        validate_limit(
            "maxSerializedBytes",
            resolved.max_serialized_bytes,
            ABSOLUTE_MAX_DOCUMENT_BYTES,
        )?;
        validate_limit("maxNodes", resolved.max_nodes, ABSOLUTE_MAX_NODES)?;
        validate_limit("maxDepth", resolved.max_depth, ABSOLUTE_MAX_DEPTH)?;
        validate_limit("maxRules", resolved.max_rules, ABSOLUTE_MAX_RULES)?;
        validate_limit(
            "maxExpressionOperations",
            resolved.max_expression_operations,
            ABSOLUTE_MAX_EXPRESSION_OPERATIONS,
        )?;
        validate_limit(
            "maxPatchOperations",
            resolved.max_patch_operations,
            ABSOLUTE_MAX_PATCH_OPERATIONS,
        )?;
        Ok(resolved)
    }
}

fn validate_limit(name: &'static str, value: u64, maximum: u64) -> Result<(), ProtocolError> {
    if value <= maximum {
        Ok(())
    } else {
        Err(ProtocolError::LimitOutOfRange {
            name,
            value,
            maximum,
        })
    }
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompileOptions {
    #[serde(default, skip_serializing_if = "CompilerCapabilities::is_empty")]
    pub capabilities: CompilerCapabilities,
    #[serde(default, skip_serializing_if = "CompilerLimitOverrides::is_empty")]
    pub limits: CompilerLimitOverrides,
    #[serde(default, skip_serializing_if = "is_false")]
    pub require_digest: bool,
}

impl CompilerCapabilities {
    fn is_empty(&self) -> bool {
        self.widgets.is_empty() && self.data_sources.is_empty() && self.actions.is_empty()
    }
}

impl CompilerLimitOverrides {
    fn is_empty(&self) -> bool {
        self == &Self::default()
    }
}

const fn is_false(value: &bool) -> bool {
    !*value
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompileRequest {
    pub api_version: String,
    pub document: CanonicalValue,
    #[serde(default, skip_serializing_if = "CompileOptions::is_empty")]
    pub options: CompileOptions,
}

impl CompileOptions {
    fn is_empty(&self) -> bool {
        self == &Self::default()
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct DecodedCompileRequest {
    pub request: CompileRequest,
    pub limits: CompilerLimits,
    pub canonical_document: Vec<u8>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
    Info,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub code: String,
    pub severity: DiagnosticSeverity,
    pub message: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
}

impl Diagnostic {
    #[must_use]
    pub fn error(
        code: impl Into<String>,
        message: impl Into<String>,
        path: impl Into<String>,
    ) -> Self {
        Self {
            code: code.into(),
            severity: DiagnosticSeverity::Error,
            message: message.into(),
            path: path.into(),
            hint: None,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileResponse {
    pub api_version: &'static str,
    pub compiler_revision: &'static str,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub normalized_document_json: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub digest: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema_profile: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub form_plan: Option<CanonicalValue>,
    pub diagnostics: Vec<Diagnostic>,
}

impl CompileResponse {
    #[must_use]
    pub fn success(
        normalized_document_json: String,
        digest: String,
        form_plan: CanonicalValue,
        diagnostics: Vec<Diagnostic>,
    ) -> Self {
        Self {
            api_version: COMPILE_RESPONSE_API_VERSION,
            compiler_revision: COMPILER_REVISION,
            ok: true,
            normalized_document_json: Some(normalized_document_json),
            digest: Some(digest),
            schema_profile: Some(FORM_SCHEMA_PROFILE_1),
            form_plan: Some(form_plan),
            diagnostics,
        }
    }

    #[must_use]
    pub fn failure(diagnostics: Vec<Diagnostic>) -> Self {
        Self {
            api_version: COMPILE_RESPONSE_API_VERSION,
            compiler_revision: COMPILER_REVISION,
            ok: false,
            normalized_document_json: None,
            digest: None,
            schema_profile: None,
            form_plan: None,
            diagnostics,
        }
    }
}

#[derive(Debug, Error)]
pub enum ProtocolError {
    #[error("compile request is {actual} bytes; the hard limit is {limit} bytes")]
    RequestTooLarge { actual: usize, limit: usize },
    #[error("compile request is not valid JSON at line {line}, column {column}")]
    InvalidJson { line: usize, column: usize },
    #[error("unsupported compile request API version {actual:?}")]
    UnsupportedApiVersion { actual: String },
    #[error("compiler limit {name} is {value}; the hard maximum is {maximum}")]
    LimitOutOfRange {
        name: &'static str,
        value: u64,
        maximum: u64,
    },
    #[error("capability {value:?} at {path} is invalid")]
    InvalidCapability { path: String, value: String },
    #[error("capability {value:?} is duplicated at {path}")]
    DuplicateCapability { path: String, value: String },
    #[error("canonical document is {actual} bytes; the configured limit is {limit} bytes")]
    DocumentTooLarge { actual: usize, limit: u64 },
    #[error("failed to encode compile response: {0}")]
    ResponseEncoding(String),
}

impl ProtocolError {
    #[must_use]
    pub fn diagnostic(&self) -> Diagnostic {
        match self {
            Self::RequestTooLarge { .. } => {
                Diagnostic::error("protocol.request_size", self.to_string(), "")
            }
            Self::InvalidJson { .. } => {
                Diagnostic::error("protocol.invalid_json", self.to_string(), "")
            }
            Self::UnsupportedApiVersion { .. } => {
                Diagnostic::error("protocol.api_version", self.to_string(), "/apiVersion")
            }
            Self::LimitOutOfRange { name, .. } => Diagnostic::error(
                "protocol.limit",
                self.to_string(),
                format!("/options/limits/{name}"),
            ),
            Self::InvalidCapability { path, .. } => {
                Diagnostic::error("protocol.capability", self.to_string(), path)
            }
            Self::DuplicateCapability { path, .. } => {
                Diagnostic::error("protocol.capability_duplicate", self.to_string(), path)
            }
            Self::DocumentTooLarge { .. } => {
                Diagnostic::error("limits.document_size", self.to_string(), "/document")
            }
            Self::ResponseEncoding(_) => {
                Diagnostic::error("protocol.response_encoding", self.to_string(), "")
            }
        }
    }
}

/// Decodes and bounds one native/WASM compile request.
pub fn decode_compile_request(input: &[u8]) -> Result<DecodedCompileRequest, ProtocolError> {
    if input.len() > ABSOLUTE_MAX_REQUEST_BYTES {
        return Err(ProtocolError::RequestTooLarge {
            actual: input.len(),
            limit: ABSOLUTE_MAX_REQUEST_BYTES,
        });
    }

    let request = serde_json::from_slice::<CompileRequest>(input).map_err(|error| {
        ProtocolError::InvalidJson {
            line: error.line(),
            column: error.column(),
        }
    })?;
    if request.api_version != COMPILE_REQUEST_API_VERSION {
        return Err(ProtocolError::UnsupportedApiVersion {
            actual: request.api_version,
        });
    }

    let limits = CompilerLimits::resolve(&request.options.limits)?;
    validate_capabilities("widgets", &request.options.capabilities.widgets)?;
    validate_capabilities("dataSources", &request.options.capabilities.data_sources)?;
    validate_capabilities("actions", &request.options.capabilities.actions)?;
    let canonical_document =
        canonicalize_value(&request.document).map_err(canonical_protocol_error)?;
    if canonical_document.len() as u64 > limits.max_serialized_bytes {
        return Err(ProtocolError::DocumentTooLarge {
            actual: canonical_document.len(),
            limit: limits.max_serialized_bytes,
        });
    }

    Ok(DecodedCompileRequest {
        request,
        limits,
        canonical_document,
    })
}

fn validate_capabilities(kind: &str, values: &[String]) -> Result<(), ProtocolError> {
    if values.len() > MAX_CAPABILITIES_PER_KIND {
        return Err(ProtocolError::InvalidCapability {
            path: format!("/options/capabilities/{kind}"),
            value: format!("{} entries", values.len()),
        });
    }

    let mut seen = std::collections::HashSet::with_capacity(values.len());
    for (index, value) in values.iter().enumerate() {
        let path = format!("/options/capabilities/{kind}/{index}");
        if value.trim().is_empty() || value.len() > MAX_CAPABILITY_KEY_BYTES {
            return Err(ProtocolError::InvalidCapability {
                path,
                value: value.clone(),
            });
        }
        if !seen.insert(value) {
            return Err(ProtocolError::DuplicateCapability {
                path,
                value: value.clone(),
            });
        }
    }
    Ok(())
}

fn canonical_protocol_error(error: CanonicalError) -> ProtocolError {
    ProtocolError::ResponseEncoding(error.to_string())
}

/// Encodes the compile response as canonical UTF-8 JSON bytes.
pub fn encode_compile_response(response: &CompileResponse) -> Result<Vec<u8>, ProtocolError> {
    let serialized = serde_json::to_vec(response)
        .map_err(|error| ProtocolError::ResponseEncoding(error.to_string()))?;
    canonicalize_json_with_limit(&serialized, ABSOLUTE_MAX_RESPONSE_BYTES)
        .map_err(canonical_protocol_error)
}
