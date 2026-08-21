use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::canonical::{CanonicalError, CanonicalValue};

pub const FORM_RELEASE_REF_API_VERSION: &str = "a3s.dev/form-release-ref/v1";
pub const FORM_INTERACTION_REQUEST_API_VERSION: &str = "a3s.dev/form-interaction-request/v1";
pub const FORM_INTERACTION_SUBMISSION_API_VERSION: &str = "a3s.dev/form-interaction-submission/v1";
pub const DEFAULT_INTERACTION_MAX_VALUE_BYTES: u64 = 1_000_000;
pub const ABSOLUTE_INTERACTION_MAX_VALUE_BYTES: u64 = 4 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FormInteractionOutcome {
    Submit,
    Approve,
    Reject,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FormReleaseMode {
    Interaction,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormReleaseRef {
    pub api_version: String,
    pub organization_id: String,
    pub project_id: String,
    pub form_id: String,
    pub release_id: String,
    pub uri: String,
    pub revision: u64,
    pub digest: String,
    pub compiler_revision: String,
    pub schema_profile: String,
    pub mode: FormReleaseMode,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkflowInteractionIdentity {
    pub workflow_run_id: String,
    pub flow_run_id: String,
    pub step_id: String,
    pub step_attempt: u64,
    pub human_task_id: String,
    pub flow_hook_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormInteractionAssignment {
    pub policy_id: String,
    pub policy_revision: u64,
    pub policy_digest: String,
    pub claimed_principal_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormInteractionTaskBinding {
    pub version: u64,
    pub created_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum FormInteractionOutputMapping {
    Identity,
    Registry {
        registry_key: String,
        revision: u64,
        digest: String,
    },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormInteractionRequest {
    pub api_version: String,
    pub request_id: String,
    pub identity: WorkflowInteractionIdentity,
    pub form: FormReleaseRef,
    pub assignment: FormInteractionAssignment,
    pub task: FormInteractionTaskBinding,
    pub allowed_outcomes: Vec<FormInteractionOutcome>,
    pub output_mapping: FormInteractionOutputMapping,
    pub max_value_bytes: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub initial_value: Option<CanonicalValue>,
    pub digest: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormInteractionSubmissionAssignment {
    pub policy_id: String,
    pub policy_revision: u64,
    pub policy_digest: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormInteractionSubmission {
    pub api_version: String,
    pub submission_id: String,
    pub request_id: String,
    pub request_digest: String,
    pub identity: WorkflowInteractionIdentity,
    pub form: FormReleaseRef,
    pub assignment: FormInteractionSubmissionAssignment,
    pub task_version: u64,
    pub principal_id: String,
    pub outcome: FormInteractionOutcome,
    pub idempotency_key: String,
    pub submitted_at: String,
    pub value: CanonicalValue,
    pub value_digest: String,
}

#[derive(Debug, Error)]
pub enum InteractionContractError {
    #[error("interaction envelope is {actual} bytes; the hard limit is {limit} bytes")]
    EnvelopeTooLarge { actual: usize, limit: usize },
    #[error("invalid interaction JSON: {0}")]
    InvalidJson(String),
    #[error("unsupported {contract} API version {actual:?}")]
    UnsupportedApiVersion {
        contract: &'static str,
        actual: String,
    },
    #[error("invalid interaction field {path}: {message}")]
    InvalidField {
        path: &'static str,
        message: &'static str,
    },
    #[error("interaction request digest does not match its canonical content")]
    RequestDigestMismatch,
    #[error("interaction value digest does not match its canonical content")]
    ValueDigestMismatch,
    #[error("failed to canonicalize interaction JSON: {0}")]
    Canonical(#[from] CanonicalError),
    #[error("failed to normalize interaction JSON: {0}")]
    Normalization(String),
}
