use thiserror::Error;

use crate::CanonicalValue;

#[derive(Clone, Debug, Error, PartialEq, Eq)]
pub enum PointerError {
    #[error("invalid JSON Pointer {0:?}")]
    InvalidPointer(String),
}

/// Decodes an RFC 6901-style pointer using the same escape behavior as the
/// TypeScript reference compiler.
pub fn decode_pointer(pointer: &str) -> Result<Vec<String>, PointerError> {
    if pointer.is_empty() {
        return Ok(Vec::new());
    }
    let Some(pointer) = pointer.strip_prefix('/') else {
        return Err(PointerError::InvalidPointer(pointer.to_owned()));
    };
    Ok(pointer
        .split('/')
        .map(|part| part.replace("~1", "/").replace("~0", "~"))
        .collect())
}

/// Resolves a pointer without cloning the selected value.
pub fn get_at_pointer<'a>(
    value: &'a CanonicalValue,
    pointer: &str,
) -> Result<Option<&'a CanonicalValue>, PointerError> {
    let mut current = value;
    for segment in decode_pointer(pointer)? {
        current = match current {
            CanonicalValue::Object(_) => match current.get(&segment) {
                Some(value) => value,
                None => return Ok(None),
            },
            CanonicalValue::Array(values) => {
                let Ok(index) = segment.parse::<usize>() else {
                    return Ok(None);
                };
                match values.get(index) {
                    Some(value) => value,
                    None => return Ok(None),
                }
            }
            _ => return Ok(None),
        };
    }
    Ok(Some(current))
}

/// Converts a schema pointer into the dot-separated value path used by Form
/// rules. Array item scopes are represented by `*`.
pub fn schema_pointer_to_value_path_template(
    pointer: &str,
) -> Result<Option<String>, PointerError> {
    let parts = decode_pointer(pointer)?;
    let mut output = Vec::new();
    let mut index = 0;
    while index < parts.len() {
        if parts[index] == "properties" && parts.get(index + 1).is_some() {
            output.push(parts[index + 1].clone());
            index += 2;
        } else if parts[index] == "items" {
            output.push("*".to_owned());
            index += 1;
        } else {
            return Ok(None);
        }
    }
    Ok((!output.is_empty()).then(|| output.join(".")))
}

/// Returns the ordered repeater scopes represented by a value-path template.
#[must_use]
pub fn value_path_template_scopes(template: &str) -> Vec<String> {
    let segments = template.split('.').collect::<Vec<_>>();
    segments
        .iter()
        .enumerate()
        .filter(|(_, segment)| **segment == "*")
        .map(|(index, _)| segments[..=index].join("."))
        .collect()
}

/// Returns whether a dependency can be resolved from a target row scope.
#[must_use]
pub fn is_value_path_scope_compatible(target: &str, dependency: &str) -> bool {
    let target_scopes = value_path_template_scopes(target);
    let dependency_scopes = value_path_template_scopes(dependency);
    dependency_scopes.len() <= target_scopes.len()
        && dependency_scopes
            .iter()
            .zip(target_scopes.iter())
            .all(|(dependency, target)| dependency == target)
}
