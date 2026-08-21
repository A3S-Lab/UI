//! Portable semantic primitives for A3S Form.
//!
//! This crate is intentionally independent from A3S Cloud and UI frameworks.
//! The current implementation establishes the byte-level canonical JSON,
//! digest, and compile-envelope contracts used by the semantic compiler.

mod canonical;
mod compiler;
mod evaluation;
mod expression;
mod interaction;
mod interaction_types;
mod pointer;
mod protocol;
mod schema;

pub use canonical::{
    canonical_sha256, canonicalize_document_for_digest, canonicalize_json,
    canonicalize_json_with_limit, canonicalize_value, digest_document_json, parse_json,
    parse_json_with_limit, CanonicalError, CanonicalValue, MAX_CANONICAL_INPUT_BYTES,
};
pub use compiler::compile_bytes;
pub use evaluation::{
    decode_evaluate_request, encode_evaluate_response, evaluate_bytes, evaluate_form_value,
    ComputedRuleTraceEntry, ComputedRuleTraceStatus, EvaluateRequest, EvaluateResponse,
    EvaluationLocaleCatalogOverride, EvaluationOptions, EvaluationProtocolError, FieldError,
    FormValueEvaluation, EVALUATE_REQUEST_API_VERSION, EVALUATE_RESPONSE_API_VERSION,
    FORM_LOCALE_CATALOG_API_VERSION,
};
pub use expression::{analyze_expression, ExpressionAnalysis, ExpressionError};
pub use interaction::{
    canonicalize_interaction_request_content, canonicalize_interaction_value,
    decode_interaction_request, decode_interaction_submission, digest_interaction_request,
    digest_interaction_value,
};
pub use interaction_types::{
    FormInteractionAssignment, FormInteractionOutcome, FormInteractionOutputMapping,
    FormInteractionRequest, FormInteractionSubmission, FormInteractionSubmissionAssignment,
    FormInteractionTaskBinding, FormReleaseMode, FormReleaseRef, InteractionContractError,
    WorkflowInteractionIdentity, ABSOLUTE_INTERACTION_MAX_VALUE_BYTES,
    DEFAULT_INTERACTION_MAX_VALUE_BYTES, FORM_INTERACTION_REQUEST_API_VERSION,
    FORM_INTERACTION_SUBMISSION_API_VERSION, FORM_RELEASE_REF_API_VERSION,
};
pub use pointer::{
    decode_pointer, get_at_pointer, is_value_path_scope_compatible,
    schema_pointer_to_value_path_template, value_path_template_scopes, PointerError,
};
pub use protocol::{
    decode_compile_request, encode_compile_response, CompileOptions, CompileRequest,
    CompileResponse, CompilerCapabilities, CompilerLimitOverrides, CompilerLimits,
    DecodedCompileRequest, Diagnostic, DiagnosticSeverity, ProtocolError,
    ABSOLUTE_MAX_DOCUMENT_BYTES, ABSOLUTE_MAX_REQUEST_BYTES, ABSOLUTE_MAX_RESPONSE_BYTES,
    COMPILER_REVISION, COMPILE_REQUEST_API_VERSION, COMPILE_RESPONSE_API_VERSION,
    FORM_SCHEMA_PROFILE_1,
};
pub use schema::{
    inspect_schema_profile, A3S_FORM_SCHEMA_PROFILE_1_ID, JSON_SCHEMA_2020_12_DIALECT,
    SUPPORTED_SCHEMA_FORMATS, SUPPORTED_SCHEMA_KEYWORDS,
};
