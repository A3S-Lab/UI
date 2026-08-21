use thiserror::Error;

use crate::CanonicalValue;

const UNARY_OPERATORS: &[&str] = &["not", "exists"];
const COLLECTION_OPERATORS: &[&str] = &["all", "any", "coalesce", "concat"];
const BINARY_OPERATORS: &[&str] = &[
    "eq", "ne", "gt", "gte", "lt", "lte", "contains", "in", "add", "subtract", "multiply", "divide",
];

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExpressionAnalysis {
    pub size: u64,
    pub field_paths: Vec<String>,
}

#[derive(Clone, Debug, Error, PartialEq, Eq)]
pub enum ExpressionError {
    #[error("expression must be an object with a supported operator")]
    InvalidExpression,
    #[error("expression contains unexpected property {0}")]
    UnexpectedProperty(String),
    #[error("expression field path must contain non-empty dot-separated segments")]
    InvalidFieldPath,
    #[error("expression {operator} values must be an array")]
    InvalidCollection { operator: String },
    #[error("unsupported expression operator {0}")]
    UnsupportedOperator(String),
}

/// Validates the bounded expression shape and returns its operation count and
/// field dependencies. Evaluation remains a separate runtime concern.
pub fn analyze_expression(input: &CanonicalValue) -> Result<ExpressionAnalysis, ExpressionError> {
    let mut field_paths = Vec::new();
    let mut size = 0;
    visit(input, &mut size, &mut field_paths)?;
    Ok(ExpressionAnalysis { size, field_paths })
}

fn visit(
    value: &CanonicalValue,
    size: &mut u64,
    field_paths: &mut Vec<String>,
) -> Result<(), ExpressionError> {
    let Some(entries) = value.as_object() else {
        return Err(ExpressionError::InvalidExpression);
    };
    let Some(operator) = value.get("op").and_then(CanonicalValue::as_str) else {
        return Err(ExpressionError::InvalidExpression);
    };
    *size += 1;

    match operator {
        "literal" => assert_only_keys(entries, &["op", "value"]),
        "field" => {
            assert_only_keys(entries, &["op", "path"])?;
            let Some(path) = value.get("path").and_then(CanonicalValue::as_str) else {
                return Err(ExpressionError::InvalidFieldPath);
            };
            if path.is_empty() || path.split('.').any(str::is_empty) {
                return Err(ExpressionError::InvalidFieldPath);
            }
            if !field_paths.iter().any(|candidate| candidate == path) {
                field_paths.push(path.to_owned());
            }
            Ok(())
        }
        operator if UNARY_OPERATORS.contains(&operator) => {
            assert_only_keys(entries, &["op", "value"])?;
            value
                .get("value")
                .ok_or(ExpressionError::InvalidExpression)
                .and_then(|child| visit(child, size, field_paths))
        }
        operator if COLLECTION_OPERATORS.contains(&operator) => {
            assert_only_keys(entries, &["op", "values"])?;
            let values = value
                .get("values")
                .and_then(CanonicalValue::as_array)
                .ok_or_else(|| ExpressionError::InvalidCollection {
                    operator: operator.to_owned(),
                })?;
            for child in values {
                visit(child, size, field_paths)?;
            }
            Ok(())
        }
        "if" => {
            assert_only_keys(entries, &["op", "condition", "whenTrue", "whenFalse"])?;
            for key in ["condition", "whenTrue", "whenFalse"] {
                visit(
                    value.get(key).ok_or(ExpressionError::InvalidExpression)?,
                    size,
                    field_paths,
                )?;
            }
            Ok(())
        }
        operator if BINARY_OPERATORS.contains(&operator) => {
            assert_only_keys(entries, &["op", "left", "right"])?;
            visit(
                value
                    .get("left")
                    .ok_or(ExpressionError::InvalidExpression)?,
                size,
                field_paths,
            )?;
            visit(
                value
                    .get("right")
                    .ok_or(ExpressionError::InvalidExpression)?,
                size,
                field_paths,
            )
        }
        _ => Err(ExpressionError::UnsupportedOperator(operator.to_owned())),
    }
}

fn assert_only_keys(
    entries: &[(String, CanonicalValue)],
    allowed: &[&str],
) -> Result<(), ExpressionError> {
    if let Some((key, _)) = entries
        .iter()
        .find(|(key, _)| !allowed.contains(&key.as_str()))
    {
        Err(ExpressionError::UnexpectedProperty(key.clone()))
    } else {
        Ok(())
    }
}
