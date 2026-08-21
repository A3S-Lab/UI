use std::collections::HashSet;

use serde::Serialize;
use url::Url;

use crate::canonical::{canonical_sha256, canonicalize_value, CanonicalValue};
use crate::interaction_types::{
    FormInteractionAssignment, FormInteractionOutcome, FormInteractionOutputMapping,
    FormInteractionRequest, FormInteractionSubmission, FormInteractionSubmissionAssignment,
    FormInteractionTaskBinding, FormReleaseRef, InteractionContractError,
    WorkflowInteractionIdentity, ABSOLUTE_INTERACTION_MAX_VALUE_BYTES,
    FORM_INTERACTION_REQUEST_API_VERSION, FORM_INTERACTION_SUBMISSION_API_VERSION,
    FORM_RELEASE_REF_API_VERSION,
};

const ABSOLUTE_MAX_INTERACTION_ENVELOPE_BYTES: usize = 5 * 1024 * 1024;
const MAX_IDENTITY_BYTES: usize = 512;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RequestDigestContent<'a> {
    api_version: &'a str,
    request_id: &'a str,
    identity: &'a WorkflowInteractionIdentity,
    form: &'a FormReleaseRef,
    assignment: &'a FormInteractionAssignment,
    task: &'a FormInteractionTaskBinding,
    allowed_outcomes: &'a [FormInteractionOutcome],
    output_mapping: &'a FormInteractionOutputMapping,
    max_value_bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    initial_value: Option<&'a CanonicalValue>,
}

impl FormReleaseRef {
    /// Validate one exact published Form identity independently from an
    /// interaction request or submission envelope.
    pub fn validate(&self) -> Result<(), InteractionContractError> {
        validate_form_release(self)
    }
}

impl FormInteractionRequest {
    pub fn validate(&self) -> Result<(), InteractionContractError> {
        require_api_version(
            &self.api_version,
            FORM_INTERACTION_REQUEST_API_VERSION,
            "interaction request",
        )?;
        require_identity(&self.request_id, "/requestId")?;
        validate_workflow_identity(&self.identity)?;
        self.form.validate()?;
        validate_assignment(&self.assignment)?;
        validate_task(&self.task)?;
        if self.allowed_outcomes.is_empty()
            || self
                .allowed_outcomes
                .iter()
                .copied()
                .collect::<HashSet<_>>()
                .len()
                != self.allowed_outcomes.len()
        {
            return Err(invalid(
                "/allowedOutcomes",
                "outcomes must be non-empty and unique",
            ));
        }
        validate_output_mapping(&self.output_mapping)?;
        if !(1..=ABSOLUTE_INTERACTION_MAX_VALUE_BYTES).contains(&self.max_value_bytes) {
            return Err(invalid("/maxValueBytes", "value limit is out of range"));
        }
        if let Some(value) = &self.initial_value {
            require_object(value, "/initialValue")?;
            if canonicalize_interaction_value(value)?.len() as u64 > self.max_value_bytes {
                return Err(invalid(
                    "/initialValue",
                    "initial value exceeds the value limit",
                ));
            }
        }
        require_digest(&self.digest, "/digest")?;
        if digest_interaction_request(self)? != self.digest {
            return Err(InteractionContractError::RequestDigestMismatch);
        }
        Ok(())
    }
}

impl FormInteractionSubmission {
    pub fn validate(&self) -> Result<(), InteractionContractError> {
        require_api_version(
            &self.api_version,
            FORM_INTERACTION_SUBMISSION_API_VERSION,
            "interaction submission",
        )?;
        require_identity(&self.submission_id, "/submissionId")?;
        require_identity(&self.request_id, "/requestId")?;
        require_digest(&self.request_digest, "/requestDigest")?;
        validate_workflow_identity(&self.identity)?;
        self.form.validate()?;
        validate_submission_assignment(&self.assignment)?;
        require_revision(self.task_version, "/taskVersion")?;
        require_identity(&self.principal_id, "/principalId")?;
        require_identity(&self.idempotency_key, "/idempotencyKey")?;
        require_timestamp(&self.submitted_at, "/submittedAt")?;
        require_object(&self.value, "/value")?;
        require_digest(&self.value_digest, "/valueDigest")?;
        if digest_interaction_value(&self.value)? != self.value_digest {
            return Err(InteractionContractError::ValueDigestMismatch);
        }
        Ok(())
    }
}

pub fn decode_interaction_request(
    input: &[u8],
) -> Result<FormInteractionRequest, InteractionContractError> {
    require_envelope_size(input)?;
    let request: FormInteractionRequest = serde_json::from_slice(input)
        .map_err(|error| InteractionContractError::InvalidJson(error.to_string()))?;
    request.validate()?;
    Ok(request)
}

pub fn decode_interaction_submission(
    input: &[u8],
) -> Result<FormInteractionSubmission, InteractionContractError> {
    require_envelope_size(input)?;
    let submission: FormInteractionSubmission = serde_json::from_slice(input)
        .map_err(|error| InteractionContractError::InvalidJson(error.to_string()))?;
    submission.validate()?;
    Ok(submission)
}

pub fn canonicalize_interaction_request_content(
    request: &FormInteractionRequest,
) -> Result<Vec<u8>, InteractionContractError> {
    canonicalize_serializable(&RequestDigestContent {
        api_version: &request.api_version,
        request_id: &request.request_id,
        identity: &request.identity,
        form: &request.form,
        assignment: &request.assignment,
        task: &request.task,
        allowed_outcomes: &request.allowed_outcomes,
        output_mapping: &request.output_mapping,
        max_value_bytes: request.max_value_bytes,
        initial_value: request.initial_value.as_ref(),
    })
}

pub fn digest_interaction_request(
    request: &FormInteractionRequest,
) -> Result<String, InteractionContractError> {
    digest_canonical(canonicalize_interaction_request_content(request)?)
}

pub fn canonicalize_interaction_value(
    value: &CanonicalValue,
) -> Result<Vec<u8>, InteractionContractError> {
    canonicalize_serializable(value)
}

pub fn digest_interaction_value(
    value: &CanonicalValue,
) -> Result<String, InteractionContractError> {
    digest_canonical(canonicalize_interaction_value(value)?)
}

fn canonicalize_serializable(value: &impl Serialize) -> Result<Vec<u8>, InteractionContractError> {
    let encoded = serde_json::to_vec(value)
        .map_err(|error| InteractionContractError::Normalization(error.to_string()))?;
    let normalized: CanonicalValue = serde_json::from_slice(&encoded)
        .map_err(|error| InteractionContractError::Normalization(error.to_string()))?;
    Ok(canonicalize_value(&normalized)?)
}

fn digest_canonical(canonical: Vec<u8>) -> Result<String, InteractionContractError> {
    Ok(format!("sha256:{}", canonical_sha256(&canonical)))
}

fn require_envelope_size(input: &[u8]) -> Result<(), InteractionContractError> {
    if input.len() <= ABSOLUTE_MAX_INTERACTION_ENVELOPE_BYTES {
        Ok(())
    } else {
        Err(InteractionContractError::EnvelopeTooLarge {
            actual: input.len(),
            limit: ABSOLUTE_MAX_INTERACTION_ENVELOPE_BYTES,
        })
    }
}

fn require_api_version(
    actual: &str,
    expected: &'static str,
    contract: &'static str,
) -> Result<(), InteractionContractError> {
    if actual == expected {
        Ok(())
    } else {
        Err(InteractionContractError::UnsupportedApiVersion {
            contract,
            actual: actual.to_owned(),
        })
    }
}

fn require_identity(value: &str, path: &'static str) -> Result<(), InteractionContractError> {
    if !value.is_empty() && value.trim() == value && value.len() <= MAX_IDENTITY_BYTES {
        Ok(())
    } else {
        Err(invalid(path, "identity is empty, padded, or oversized"))
    }
}

fn require_revision(value: u64, path: &'static str) -> Result<(), InteractionContractError> {
    if value <= MAX_SAFE_INTEGER {
        Ok(())
    } else {
        Err(invalid(path, "revision exceeds the portable integer range"))
    }
}

fn require_digest(value: &str, path: &'static str) -> Result<(), InteractionContractError> {
    let valid = value.strip_prefix("sha256:").is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    });
    if valid {
        Ok(())
    } else {
        Err(invalid(
            path,
            "digest must be lower-case sha256 hexadecimal",
        ))
    }
}

fn validate_workflow_identity(
    identity: &WorkflowInteractionIdentity,
) -> Result<(), InteractionContractError> {
    require_identity(&identity.workflow_run_id, "/identity/workflowRunId")?;
    require_identity(&identity.flow_run_id, "/identity/flowRunId")?;
    require_identity(&identity.step_id, "/identity/stepId")?;
    require_revision(identity.step_attempt, "/identity/stepAttempt")?;
    require_identity(&identity.human_task_id, "/identity/humanTaskId")?;
    require_identity(&identity.flow_hook_id, "/identity/flowHookId")
}

fn validate_form_release(form: &FormReleaseRef) -> Result<(), InteractionContractError> {
    require_api_version(
        &form.api_version,
        FORM_RELEASE_REF_API_VERSION,
        "Form release reference",
    )?;
    require_identity(&form.organization_id, "/form/organizationId")?;
    require_identity(&form.project_id, "/form/projectId")?;
    require_identity(&form.form_id, "/form/formId")?;
    require_identity(&form.release_id, "/form/releaseId")?;
    require_identity(&form.uri, "/form/uri")?;
    Url::parse(&form.uri).map_err(|_| invalid("/form/uri", "URI is invalid"))?;
    require_revision(form.revision, "/form/revision")?;
    require_digest(&form.digest, "/form/digest")?;
    require_identity(&form.compiler_revision, "/form/compilerRevision")?;
    require_identity(&form.schema_profile, "/form/schemaProfile")
}

fn validate_assignment(
    assignment: &FormInteractionAssignment,
) -> Result<(), InteractionContractError> {
    require_identity(&assignment.policy_id, "/assignment/policyId")?;
    require_revision(assignment.policy_revision, "/assignment/policyRevision")?;
    require_digest(&assignment.policy_digest, "/assignment/policyDigest")?;
    require_identity(
        &assignment.claimed_principal_id,
        "/assignment/claimedPrincipalId",
    )
}

fn validate_submission_assignment(
    assignment: &FormInteractionSubmissionAssignment,
) -> Result<(), InteractionContractError> {
    require_identity(&assignment.policy_id, "/assignment/policyId")?;
    require_revision(assignment.policy_revision, "/assignment/policyRevision")?;
    require_digest(&assignment.policy_digest, "/assignment/policyDigest")
}

fn validate_task(task: &FormInteractionTaskBinding) -> Result<(), InteractionContractError> {
    require_revision(task.version, "/task/version")?;
    require_timestamp(&task.created_at, "/task/createdAt")?;
    if let Some(due_at) = &task.due_at {
        require_timestamp(due_at, "/task/dueAt")?;
        if due_at < &task.created_at {
            return Err(invalid("/task/dueAt", "deadline precedes task creation"));
        }
    }
    if let Some(expires_at) = &task.expires_at {
        require_timestamp(expires_at, "/task/expiresAt")?;
        if expires_at < &task.created_at {
            return Err(invalid("/task/expiresAt", "expiry precedes task creation"));
        }
    }
    Ok(())
}

fn validate_output_mapping(
    mapping: &FormInteractionOutputMapping,
) -> Result<(), InteractionContractError> {
    if let FormInteractionOutputMapping::Registry {
        registry_key,
        revision,
        digest,
    } = mapping
    {
        require_identity(registry_key, "/outputMapping/registryKey")?;
        require_revision(*revision, "/outputMapping/revision")?;
        require_digest(digest, "/outputMapping/digest")?;
    }
    Ok(())
}

fn require_object(
    value: &CanonicalValue,
    path: &'static str,
) -> Result<(), InteractionContractError> {
    if value.as_object().is_some() {
        Ok(())
    } else {
        Err(invalid(path, "value must be a JSON object"))
    }
}

fn require_timestamp(value: &str, path: &'static str) -> Result<(), InteractionContractError> {
    if is_canonical_timestamp(value) {
        Ok(())
    } else {
        Err(invalid(
            path,
            "timestamp must be canonical UTC milliseconds",
        ))
    }
}

fn is_canonical_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 24
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes[19] != b'.'
        || bytes[23] != b'Z'
    {
        return false;
    }
    let Some(year) = decimal(bytes, 0, 4) else {
        return false;
    };
    let Some(month) = decimal(bytes, 5, 7) else {
        return false;
    };
    let Some(day) = decimal(bytes, 8, 10) else {
        return false;
    };
    let Some(hour) = decimal(bytes, 11, 13) else {
        return false;
    };
    let Some(minute) = decimal(bytes, 14, 16) else {
        return false;
    };
    let Some(second) = decimal(bytes, 17, 19) else {
        return false;
    };
    if decimal(bytes, 20, 23).is_none() || !(1..=12).contains(&month) {
        return false;
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        2 if leap => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    };
    (1..=days).contains(&day) && hour <= 23 && minute <= 59 && second <= 59
}

fn decimal(bytes: &[u8], start: usize, end: usize) -> Option<u32> {
    bytes
        .get(start..end)?
        .iter()
        .try_fold(0_u32, |value, byte| {
            byte.is_ascii_digit()
                .then_some(value * 10 + u32::from(*byte - b'0'))
        })
}

const fn invalid(path: &'static str, message: &'static str) -> InteractionContractError {
    InteractionContractError::InvalidField { path, message }
}
