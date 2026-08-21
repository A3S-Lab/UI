use std::cmp::Ordering;
use std::collections::HashSet;

use serde::de::{Error as DeError, MapAccess, SeqAccess, Visitor};
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use sha2::{Digest, Sha256};
use thiserror::Error;

/// Hard input boundary shared by native and WASM adapters.
pub const MAX_CANONICAL_INPUT_BYTES: usize = 4 * 1024 * 1024;

/// A JSON value whose numbers have JavaScript `Number` semantics.
///
/// Object entries preserve input order so duplicate keys can be rejected while
/// parsing. Canonical serialization applies JavaScript UTF-16 key ordering.
#[derive(Clone, Debug, PartialEq)]
pub enum CanonicalValue {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<Self>),
    Object(Vec<(String, Self)>),
}

impl CanonicalValue {
    #[must_use]
    pub const fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Bool(value) => Some(*value),
            _ => None,
        }
    }

    #[must_use]
    pub const fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Number(value) => Some(*value),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::String(value) => Some(value),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_array(&self) -> Option<&[Self]> {
        match self {
            Self::Array(values) => Some(values),
            _ => None,
        }
    }

    pub fn as_array_mut(&mut self) -> Option<&mut Vec<Self>> {
        match self {
            Self::Array(values) => Some(values),
            _ => None,
        }
    }

    /// Returns the object entries when this value is an object.
    #[must_use]
    pub fn as_object(&self) -> Option<&[(String, Self)]> {
        match self {
            Self::Object(entries) => Some(entries),
            _ => None,
        }
    }

    /// Returns mutable object entries when this value is an object.
    pub fn as_object_mut(&mut self) -> Option<&mut Vec<(String, Self)>> {
        match self {
            Self::Object(entries) => Some(entries),
            _ => None,
        }
    }

    /// Returns an object field without changing input order.
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&Self> {
        self.as_object()?
            .iter()
            .find_map(|(candidate, value)| (candidate == key).then_some(value))
    }

    /// Returns a mutable object field without changing input order.
    pub fn get_mut(&mut self, key: &str) -> Option<&mut Self> {
        self.as_object_mut()?
            .iter_mut()
            .find_map(|(candidate, value)| (candidate == key).then_some(value))
    }

    /// Replaces an object field in place or appends a new field.
    pub fn insert(&mut self, key: impl Into<String>, value: Self) -> Option<Self> {
        let key = key.into();
        let entries = self.as_object_mut()?;
        if let Some((_, current)) = entries.iter_mut().find(|(candidate, _)| *candidate == key) {
            return Some(std::mem::replace(current, value));
        }
        entries.push((key, value));
        None
    }

    /// Removes an object field and returns its value.
    pub fn remove(&mut self, key: &str) -> Option<Self> {
        let entries = self.as_object_mut()?;
        let index = entries.iter().position(|(candidate, _)| candidate == key)?;
        Some(entries.remove(index).1)
    }
}

impl Serialize for CanonicalValue {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::Null => serializer.serialize_unit(),
            Self::Bool(value) => serializer.serialize_bool(*value),
            Self::Number(value) => serializer.serialize_f64(*value),
            Self::String(value) => serializer.serialize_str(value),
            Self::Array(values) => {
                let mut sequence = serializer.serialize_seq(Some(values.len()))?;
                for value in values {
                    sequence.serialize_element(value)?;
                }
                sequence.end()
            }
            Self::Object(entries) => {
                let mut map = serializer.serialize_map(Some(entries.len()))?;
                for (key, value) in entries {
                    map.serialize_entry(key, value)?;
                }
                map.end()
            }
        }
    }
}

struct CanonicalValueVisitor;

impl CanonicalValueVisitor {
    fn finite_number<E>(value: f64) -> Result<CanonicalValue, E>
    where
        E: DeError,
    {
        if value.is_finite() {
            Ok(CanonicalValue::Number(value))
        } else {
            Err(E::custom("non-finite JSON number"))
        }
    }
}

impl<'de> Visitor<'de> for CanonicalValueVisitor {
    type Value = CanonicalValue;

    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("a finite JSON value without duplicate object keys")
    }

    fn visit_unit<E>(self) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Ok(CanonicalValue::Null)
    }

    fn visit_none<E>(self) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Ok(CanonicalValue::Null)
    }

    fn visit_bool<E>(self, value: bool) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Ok(CanonicalValue::Bool(value))
    }

    fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Self::finite_number(value as f64)
    }

    fn visit_i128<E>(self, value: i128) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Self::finite_number(value as f64)
    }

    fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Self::finite_number(value as f64)
    }

    fn visit_u128<E>(self, value: u128) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Self::finite_number(value as f64)
    }

    fn visit_f64<E>(self, value: f64) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Self::finite_number(value)
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Ok(CanonicalValue::String(value.to_owned()))
    }

    fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
    where
        E: DeError,
    {
        Ok(CanonicalValue::String(value))
    }

    fn visit_seq<A>(self, mut sequence: A) -> Result<Self::Value, A::Error>
    where
        A: SeqAccess<'de>,
    {
        let mut values = Vec::with_capacity(sequence.size_hint().unwrap_or(0));
        while let Some(value) = sequence.next_element()? {
            values.push(value);
        }
        Ok(CanonicalValue::Array(values))
    }

    fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
    where
        A: MapAccess<'de>,
    {
        let mut entries = Vec::with_capacity(map.size_hint().unwrap_or(0));
        let mut keys = HashSet::with_capacity(map.size_hint().unwrap_or(0));
        while let Some(key) = map.next_key::<String>()? {
            if !keys.insert(key.clone()) {
                return Err(A::Error::custom(format!("duplicate object key {key:?}")));
            }
            let value = map.next_value()?;
            entries.push((key, value));
        }
        Ok(CanonicalValue::Object(entries))
    }
}

impl<'de> Deserialize<'de> for CanonicalValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(CanonicalValueVisitor)
    }
}

#[derive(Debug, Error)]
pub enum CanonicalError {
    #[error("canonical JSON input is {actual} bytes; the limit is {limit} bytes")]
    InputTooLarge { actual: usize, limit: usize },
    #[error("invalid canonical JSON at line {line}, column {column}: {message}")]
    InvalidJson {
        line: usize,
        column: usize,
        message: String,
    },
    #[error("document digest input must be a JSON object")]
    DocumentMustBeObject,
    #[error("failed to serialize canonical JSON string: {0}")]
    StringSerialization(#[source] serde_json::Error),
}

/// Parses JSON using JavaScript-compatible number semantics and rejects
/// duplicate object keys.
pub fn parse_json(input: &[u8]) -> Result<CanonicalValue, CanonicalError> {
    parse_json_with_limit(input, MAX_CANONICAL_INPUT_BYTES)
}

/// Parses JSON after enforcing a caller-provided byte limit.
pub fn parse_json_with_limit(input: &[u8], limit: usize) -> Result<CanonicalValue, CanonicalError> {
    if input.len() > limit {
        return Err(CanonicalError::InputTooLarge {
            actual: input.len(),
            limit,
        });
    }

    let mut deserializer = serde_json::Deserializer::from_slice(input);
    let value = CanonicalValue::deserialize(&mut deserializer).map_err(invalid_json)?;
    deserializer.end().map_err(invalid_json)?;
    Ok(value)
}

fn invalid_json(error: serde_json::Error) -> CanonicalError {
    CanonicalError::InvalidJson {
        line: error.line(),
        column: error.column(),
        message: error.to_string(),
    }
}

/// Canonicalizes JSON bytes with the default hard input boundary.
pub fn canonicalize_json(input: &[u8]) -> Result<Vec<u8>, CanonicalError> {
    canonicalize_json_with_limit(input, MAX_CANONICAL_INPUT_BYTES)
}

/// Canonicalizes JSON bytes after enforcing a caller-provided input boundary.
pub fn canonicalize_json_with_limit(input: &[u8], limit: usize) -> Result<Vec<u8>, CanonicalError> {
    let value = parse_json_with_limit(input, limit)?;
    canonicalize_value(&value)
}

/// Serializes a parsed value using JavaScript UTF-16 object-key ordering and
/// ECMAScript number formatting.
pub fn canonicalize_value(value: &CanonicalValue) -> Result<Vec<u8>, CanonicalError> {
    let mut output = Vec::new();
    write_canonical(value, &mut output)?;
    Ok(output)
}

fn write_canonical(value: &CanonicalValue, output: &mut Vec<u8>) -> Result<(), CanonicalError> {
    match value {
        CanonicalValue::Null => output.extend_from_slice(b"null"),
        CanonicalValue::Bool(true) => output.extend_from_slice(b"true"),
        CanonicalValue::Bool(false) => output.extend_from_slice(b"false"),
        CanonicalValue::Number(value) => {
            if *value == 0.0 {
                output.push(b'0');
            } else {
                let mut buffer = ryu_js::Buffer::new();
                output.extend_from_slice(buffer.format_finite(*value).as_bytes());
            }
        }
        CanonicalValue::String(value) => {
            serde_json::to_writer(output, value).map_err(CanonicalError::StringSerialization)?;
        }
        CanonicalValue::Array(values) => {
            output.push(b'[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(b',');
                }
                write_canonical(value, output)?;
            }
            output.push(b']');
        }
        CanonicalValue::Object(entries) => {
            let mut ordered = entries.iter().collect::<Vec<_>>();
            ordered.sort_by(|(left, _), (right, _)| compare_utf16(left, right));
            output.push(b'{');
            for (index, (key, value)) in ordered.into_iter().enumerate() {
                if index > 0 {
                    output.push(b',');
                }
                serde_json::to_writer(&mut *output, key)
                    .map_err(CanonicalError::StringSerialization)?;
                output.push(b':');
                write_canonical(value, output)?;
            }
            output.push(b'}');
        }
    }
    Ok(())
}

fn compare_utf16(left: &str, right: &str) -> Ordering {
    left.encode_utf16().cmp(right.encode_utf16())
}

/// Returns the lower-case SHA-256 hexadecimal digest of canonical bytes.
#[must_use]
pub fn canonical_sha256(canonical: &[u8]) -> String {
    let digest = Sha256::digest(canonical);
    let mut output = String::with_capacity(64);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}

/// Canonicalizes a form document after excluding only its top-level `digest`
/// field, matching the published A3S Form digest contract.
pub fn canonicalize_document_for_digest(input: &[u8]) -> Result<Vec<u8>, CanonicalError> {
    let mut value = parse_json(input)?;
    if value.as_object().is_none() {
        return Err(CanonicalError::DocumentMustBeObject);
    }
    value.remove("digest");
    canonicalize_value(&value)
}

/// Computes the `sha256:<hex>` identity for a form document.
pub fn digest_document_json(input: &[u8]) -> Result<String, CanonicalError> {
    let canonical = canonicalize_document_for_digest(input)?;
    Ok(format!("sha256:{}", canonical_sha256(&canonical)))
}
