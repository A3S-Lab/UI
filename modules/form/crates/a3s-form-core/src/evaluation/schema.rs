use std::net::Ipv6Addr;
use std::str::FromStr;

use crate::{canonicalize_value, CanonicalValue};

use super::locale::{format_message, ValidationMessages};
use super::FieldError;

pub(super) fn validate_schema(
    schema: &CanonicalValue,
    value: Option<&CanonicalValue>,
    path: &str,
    errors: &mut Vec<FieldError>,
    messages: &ValidationMessages,
) {
    let Some(value) = value else {
        return;
    };
    if matches!(value, CanonicalValue::Null) {
        return;
    }
    let schema_type = schema.get("type").and_then(CanonicalValue::as_str);
    if schema_type.is_some_and(|schema_type| !type_matches(schema_type, value)) {
        errors.push(FieldError::new(
            "type",
            format_message(
                &messages.validation_type,
                &[("type", schema_type.unwrap_or_default().to_owned())],
            ),
            path,
        ));
        return;
    }

    if let CanonicalValue::String(value) = value {
        validate_string(schema, value, path, errors, messages);
    }
    if let CanonicalValue::Number(value) = value {
        validate_number(schema, *value, path, errors, messages);
    }
    if let Some(constant) = schema.get("const") {
        if !json_values_equal(constant, value) {
            errors.push(FieldError::new(
                "const",
                messages.validation_const.clone(),
                path,
            ));
        }
    }
    if let Some(values) = schema.get("enum").and_then(CanonicalValue::as_array) {
        if !values
            .iter()
            .any(|candidate| json_values_equal(candidate, value))
        {
            errors.push(FieldError::new(
                "enum",
                messages.validation_enum.clone(),
                path,
            ));
        }
    }
    if let CanonicalValue::Array(values) = value {
        validate_array(schema, values, path, errors, messages);
    }
    if let CanonicalValue::Object(entries) = value {
        validate_object(schema, entries, path, errors, messages);
    }
}

fn type_matches(schema_type: &str, value: &CanonicalValue) -> bool {
    match schema_type {
        "string" => matches!(value, CanonicalValue::String(_)),
        "number" => matches!(value, CanonicalValue::Number(value) if value.is_finite()),
        "integer" => {
            matches!(value, CanonicalValue::Number(value) if value.is_finite() && value.fract() == 0.0)
        }
        "boolean" => matches!(value, CanonicalValue::Bool(_)),
        "array" => matches!(value, CanonicalValue::Array(_)),
        "object" => matches!(value, CanonicalValue::Object(_)),
        "null" => matches!(value, CanonicalValue::Null),
        _ => true,
    }
}

fn validate_string(
    schema: &CanonicalValue,
    value: &str,
    path: &str,
    errors: &mut Vec<FieldError>,
    messages: &ValidationMessages,
) {
    let length = value.chars().count() as f64;
    if let Some(minimum) = schema.get("minLength").and_then(CanonicalValue::as_f64) {
        if length < minimum {
            errors.push(FieldError::new(
                "minLength",
                format_message(
                    &messages.validation_min_length,
                    &[("minimum", number_text(minimum))],
                ),
                path,
            ));
        }
    }
    if let Some(maximum) = schema.get("maxLength").and_then(CanonicalValue::as_f64) {
        if length > maximum {
            errors.push(FieldError::new(
                "maxLength",
                format_message(
                    &messages.validation_max_length,
                    &[("maximum", number_text(maximum))],
                ),
                path,
            ));
        }
    }
    if let Some(pattern) = schema.get("pattern").and_then(CanonicalValue::as_str) {
        match regress::Regex::new(pattern) {
            Ok(pattern) if pattern.find(value).is_none() => errors.push(FieldError::new(
                "pattern",
                messages.validation_pattern.clone(),
                path,
            )),
            Err(_) => errors.push(FieldError::new(
                "pattern.invalid",
                messages.validation_invalid_pattern.clone(),
                path,
            )),
            _ => {}
        }
    }
    if let Some(format) = schema.get("format").and_then(CanonicalValue::as_str) {
        if !is_schema_format_valid(format, value) {
            errors.push(FieldError::new(
                format!("format.{format}"),
                format_message(
                    &messages.validation_format,
                    &[("format", format.to_owned())],
                ),
                path,
            ));
        }
    }
}

fn validate_number(
    schema: &CanonicalValue,
    value: f64,
    path: &str,
    errors: &mut Vec<FieldError>,
    messages: &ValidationMessages,
) {
    if let Some(minimum) = schema.get("minimum").and_then(CanonicalValue::as_f64) {
        if value < minimum {
            errors.push(FieldError::new(
                "minimum",
                format_message(
                    &messages.validation_minimum,
                    &[("minimum", number_text(minimum))],
                ),
                path,
            ));
        }
    }
    if let Some(maximum) = schema.get("maximum").and_then(CanonicalValue::as_f64) {
        if value > maximum {
            errors.push(FieldError::new(
                "maximum",
                format_message(
                    &messages.validation_maximum,
                    &[("maximum", number_text(maximum))],
                ),
                path,
            ));
        }
    }
    if let Some(multiple_of) = schema.get("multipleOf").and_then(CanonicalValue::as_f64) {
        let quotient = value / multiple_of;
        let tolerance = f64::EPSILON * quotient.abs().max(1.0) * 8.0;
        if (quotient - quotient.round()).abs() > tolerance {
            errors.push(FieldError::new(
                "multipleOf",
                format_message(
                    &messages.validation_multiple_of,
                    &[("multipleOf", number_text(multiple_of))],
                ),
                path,
            ));
        }
    }
}

fn validate_array(
    schema: &CanonicalValue,
    values: &[CanonicalValue],
    path: &str,
    errors: &mut Vec<FieldError>,
    messages: &ValidationMessages,
) {
    if let Some(minimum) = schema.get("minItems").and_then(CanonicalValue::as_f64) {
        if (values.len() as f64) < minimum {
            errors.push(FieldError::new(
                "minItems",
                format_message(
                    &messages.validation_min_items,
                    &[("minimum", number_text(minimum))],
                ),
                path,
            ));
        }
    }
    if let Some(maximum) = schema.get("maxItems").and_then(CanonicalValue::as_f64) {
        if values.len() as f64 > maximum {
            errors.push(FieldError::new(
                "maxItems",
                format_message(
                    &messages.validation_max_items,
                    &[("maximum", number_text(maximum))],
                ),
                path,
            ));
        }
    }
    if schema.get("uniqueItems").and_then(CanonicalValue::as_bool) == Some(true)
        && values.iter().enumerate().any(|(index, value)| {
            values[..index]
                .iter()
                .any(|previous| json_values_equal(previous, value))
        })
    {
        errors.push(FieldError::new(
            "uniqueItems",
            messages.validation_unique_items.clone(),
            path,
        ));
    }
    if let Some(items) = schema.get("items") {
        for (index, value) in values.iter().enumerate() {
            validate_schema(
                items,
                Some(value),
                &child_path(path, &index.to_string()),
                errors,
                messages,
            );
        }
    }
}

fn validate_object(
    schema: &CanonicalValue,
    entries: &[(String, CanonicalValue)],
    path: &str,
    errors: &mut Vec<FieldError>,
    messages: &ValidationMessages,
) {
    if let Some(required) = schema.get("required").and_then(CanonicalValue::as_array) {
        for required in required.iter().filter_map(CanonicalValue::as_str) {
            let value = entries
                .iter()
                .find_map(|(key, value)| (key == required).then_some(value));
            let missing = match value {
                None | Some(CanonicalValue::Null) => true,
                Some(CanonicalValue::String(value)) => value.is_empty(),
                Some(_) => false,
            };
            if missing {
                errors.push(FieldError::new(
                    "required",
                    messages.validation_required.clone(),
                    child_path(path, required),
                ));
            }
        }
    }
    let properties = schema.get("properties").and_then(CanonicalValue::as_object);
    if let Some(properties) = properties {
        for (key, child) in properties {
            let value = entries
                .iter()
                .find_map(|(candidate, value)| (candidate == key).then_some(value));
            validate_schema(child, value, &child_path(path, key), errors, messages);
        }
    }
    for (key, value) in entries {
        if properties
            .is_some_and(|properties| properties.iter().any(|(candidate, _)| candidate == key))
        {
            continue;
        }
        let child_path = child_path(path, key);
        match schema.get("additionalProperties") {
            Some(CanonicalValue::Bool(false)) => errors.push(FieldError::new(
                "additionalProperties",
                messages.validation_additional_properties.clone(),
                child_path,
            )),
            Some(additional @ CanonicalValue::Object(_)) => {
                validate_schema(additional, Some(value), &child_path, errors, messages)
            }
            _ => {}
        }
    }
}

fn child_path(path: &str, child: &str) -> String {
    if path.is_empty() {
        child.to_owned()
    } else {
        format!("{path}.{child}")
    }
}

fn json_values_equal(left: &CanonicalValue, right: &CanonicalValue) -> bool {
    match (canonicalize_value(left), canonicalize_value(right)) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

fn number_text(value: f64) -> String {
    if value == 0.0 {
        "0".to_owned()
    } else {
        ryu_js::Buffer::new().format_finite(value).to_owned()
    }
}

fn is_schema_format_valid(format: &str, value: &str) -> bool {
    match format {
        "email" => valid_email(value),
        "uri" => valid_uri(value),
        "date" => valid_date(value),
        "date-time" => value
            .split_once('T')
            .is_some_and(|(date, time)| valid_date(date) && valid_time(time)),
        "time" => valid_time(value),
        "hostname" => valid_hostname(value),
        "ipv4" => valid_ipv4(value),
        "ipv6" => Ipv6Addr::from_str(value).is_ok(),
        "uuid" => valid_uuid(value),
        _ => false,
    }
}

fn valid_email(value: &str) -> bool {
    let mut parts = value.split('@');
    let local = parts.next().unwrap_or_default();
    let domain = parts.next().unwrap_or_default();
    !local.is_empty()
        && !domain.is_empty()
        && parts.next().is_none()
        && !value.chars().any(char::is_whitespace)
        && domain
            .split_once('.')
            .is_some_and(|(left, right)| !left.is_empty() && !right.is_empty())
}

fn valid_uri(value: &str) -> bool {
    let Some((scheme, _)) = value.split_once(':') else {
        return false;
    };
    !scheme.is_empty()
        && scheme.chars().enumerate().all(|(index, character)| {
            if index == 0 {
                character.is_ascii_alphabetic()
            } else {
                character.is_ascii_alphanumeric() || matches!(character, '+' | '.' | '-')
            }
        })
        && url::Url::parse(value).is_ok()
}

fn valid_date(value: &str) -> bool {
    let mut parts = value.split('-');
    let (Some(year), Some(month), Some(day), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    if year.len() != 4 || month.len() != 2 || day.len() != 2 {
        return false;
    }
    let (Ok(year), Ok(month), Ok(day)) = (
        year.parse::<u32>(),
        month.parse::<u32>(),
        day.parse::<u32>(),
    ) else {
        return false;
    };
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let maximum = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    day > 0 && day <= maximum
}

fn valid_time(value: &str) -> bool {
    regress::Regex::new(
        r"^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$",
    )
    .is_ok_and(|pattern| pattern.find(value).is_some())
}

fn valid_hostname(value: &str) -> bool {
    if value.is_empty() || value.len() > 253 {
        return false;
    }
    let value = value.strip_suffix('.').unwrap_or(value);
    !value.is_empty()
        && value.split('.').all(|label| {
            !label.is_empty()
                && label.len() <= 63
                && label
                    .chars()
                    .all(|character| character.is_ascii_alphanumeric() || character == '-')
                && label
                    .chars()
                    .next()
                    .is_some_and(|character| character.is_ascii_alphanumeric())
                && label
                    .chars()
                    .last()
                    .is_some_and(|character| character.is_ascii_alphanumeric())
        })
}

fn valid_ipv4(value: &str) -> bool {
    let parts = value.split('.').collect::<Vec<_>>();
    parts.len() == 4
        && parts.iter().all(|part| {
            !part.is_empty()
                && (part.len() == 1 || !part.starts_with('0'))
                && part.chars().all(|character| character.is_ascii_digit())
                && part.parse::<u16>().is_ok_and(|value| value <= 255)
        })
}

fn valid_uuid(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23].iter().all(|index| bytes[*index] == b'-')
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| [8, 13, 18, 23].contains(&index) || byte.is_ascii_hexdigit())
        && matches!(bytes[14].to_ascii_lowercase(), b'1'..=b'8')
        && matches!(bytes[19].to_ascii_lowercase(), b'8' | b'9' | b'a' | b'b')
}
