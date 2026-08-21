use std::cmp::Ordering;

use crate::{canonicalize_value, CanonicalValue};

use super::path::{get_at_path, resolve_value_path_template};

pub(super) fn evaluate_expression(
    expression: &CanonicalValue,
    value: &CanonicalValue,
    max_operations: u64,
    row_indices: Option<&[usize]>,
) -> Result<Option<CanonicalValue>, String> {
    Evaluator {
        value,
        max_operations,
        operations: 0,
        row_indices,
    }
    .evaluate(expression)
}

struct Evaluator<'a> {
    value: &'a CanonicalValue,
    max_operations: u64,
    operations: u64,
    row_indices: Option<&'a [usize]>,
}

impl Evaluator<'_> {
    fn evaluate(&mut self, node: &CanonicalValue) -> Result<Option<CanonicalValue>, String> {
        self.operations += 1;
        if self.operations > self.max_operations {
            return Err(format!(
                "Error: Expression operation limit exceeded ({}).",
                self.max_operations
            ));
        }
        let operator = node
            .get("op")
            .and_then(CanonicalValue::as_str)
            .ok_or_else(|| {
                "TypeError: Expression must be an object with a supported operator.".to_owned()
            })?;
        match operator {
            "literal" => node
                .get("value")
                .cloned()
                .map(Some)
                .ok_or_else(|| "TypeError: Expression literal must be a JSON value.".to_owned()),
            "field" => self.evaluate_field(node),
            "not" => Ok(Some(CanonicalValue::Bool(!truthy(
                self.evaluate_child(node, "value")?.as_ref(),
            )))),
            "exists" => {
                let result = self.evaluate_child(node, "value")?;
                Ok(Some(CanonicalValue::Bool(exists(result.as_ref()))))
            }
            "all" => self.evaluate_all(node),
            "any" => self.evaluate_any(node),
            "coalesce" => self.evaluate_coalesce(node),
            "concat" => self.evaluate_concat(node),
            "if" => {
                let condition = self.evaluate_child(node, "condition")?;
                if truthy(condition.as_ref()) {
                    self.evaluate_child(node, "whenTrue")
                } else {
                    self.evaluate_child(node, "whenFalse")
                }
            }
            "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "add" | "subtract"
            | "multiply" | "divide" => self.evaluate_binary(node, operator),
            _ => Err(format!(
                "TypeError: Unsupported expression operator {operator}."
            )),
        }
    }

    fn evaluate_field(&self, node: &CanonicalValue) -> Result<Option<CanonicalValue>, String> {
        let declared = node
            .get("path")
            .and_then(CanonicalValue::as_str)
            .ok_or_else(|| {
                "TypeError: Expression field path must contain non-empty dot-separated segments."
                    .to_owned()
            })?;
        let resolved = match self.row_indices {
            Some(indices) => resolve_value_path_template(declared, indices),
            None => Some(declared.to_owned()),
        }
        .ok_or_else(|| format!("Error: Expression field path {declared} could not be resolved."))?;
        Ok(get_at_path(self.value, &resolved).cloned())
    }

    fn evaluate_child(
        &mut self,
        node: &CanonicalValue,
        key: &str,
    ) -> Result<Option<CanonicalValue>, String> {
        let child = node.get(key).ok_or_else(|| {
            "TypeError: Expression must be an object with a supported operator.".to_owned()
        })?;
        self.evaluate(child)
    }

    fn collection<'a>(&self, node: &'a CanonicalValue) -> Result<&'a [CanonicalValue], String> {
        node.get("values")
            .and_then(CanonicalValue::as_array)
            .ok_or_else(|| {
                let operator = node
                    .get("op")
                    .and_then(CanonicalValue::as_str)
                    .unwrap_or("unknown");
                format!("TypeError: Expression {operator} values must be an array.")
            })
    }

    fn evaluate_all(&mut self, node: &CanonicalValue) -> Result<Option<CanonicalValue>, String> {
        for child in self.collection(node)? {
            if !truthy(self.evaluate(child)?.as_ref()) {
                return Ok(Some(CanonicalValue::Bool(false)));
            }
        }
        Ok(Some(CanonicalValue::Bool(true)))
    }

    fn evaluate_any(&mut self, node: &CanonicalValue) -> Result<Option<CanonicalValue>, String> {
        for child in self.collection(node)? {
            if truthy(self.evaluate(child)?.as_ref()) {
                return Ok(Some(CanonicalValue::Bool(true)));
            }
        }
        Ok(Some(CanonicalValue::Bool(false)))
    }

    fn evaluate_coalesce(
        &mut self,
        node: &CanonicalValue,
    ) -> Result<Option<CanonicalValue>, String> {
        for child in self.collection(node)? {
            let result = self.evaluate(child)?;
            if !matches!(result, None | Some(CanonicalValue::Null)) {
                return Ok(result);
            }
        }
        Ok(None)
    }

    fn evaluate_concat(&mut self, node: &CanonicalValue) -> Result<Option<CanonicalValue>, String> {
        let mut output = String::new();
        for child in self.collection(node)? {
            output.push_str(&scalar_text(self.evaluate(child)?.as_ref())?);
        }
        Ok(Some(CanonicalValue::String(output)))
    }

    fn evaluate_binary(
        &mut self,
        node: &CanonicalValue,
        operator: &str,
    ) -> Result<Option<CanonicalValue>, String> {
        let left = self.evaluate_child(node, "left")?;
        let right = self.evaluate_child(node, "right")?;
        let result = match operator {
            "eq" => CanonicalValue::Bool(json_values_equal(left.as_ref(), right.as_ref())),
            "ne" => CanonicalValue::Bool(!json_values_equal(left.as_ref(), right.as_ref())),
            "gt" | "gte" | "lt" | "lte" => {
                CanonicalValue::Bool(relational(left.as_ref(), right.as_ref(), operator))
            }
            "contains" => CanonicalValue::Bool(contains(left.as_ref(), right.as_ref())),
            "in" => CanonicalValue::Bool(in_collection(left.as_ref(), right.as_ref())),
            "add" | "subtract" | "multiply" | "divide" => {
                let left_number = finite_number(left.as_ref(), operator)?;
                let right_number = finite_number(right.as_ref(), operator)?;
                if operator == "divide" && right_number == 0.0 {
                    return Err("RangeError: Expression cannot divide by zero.".to_owned());
                }
                let number = match operator {
                    "add" => left_number + right_number,
                    "subtract" => left_number - right_number,
                    "multiply" => left_number * right_number,
                    "divide" => left_number / right_number,
                    _ => {
                        return Err(format!(
                            "TypeError: Unsupported expression operator {operator}."
                        ));
                    }
                };
                if !number.is_finite() {
                    return Err(format!(
                        "RangeError: Expression {operator} result must be a finite number."
                    ));
                }
                CanonicalValue::Number(number)
            }
            _ => {
                return Err(format!(
                    "TypeError: Unsupported expression operator {operator}."
                ));
            }
        };
        Ok(Some(result))
    }
}

fn truthy(value: Option<&CanonicalValue>) -> bool {
    match value {
        None | Some(CanonicalValue::Null) | Some(CanonicalValue::Bool(false)) => false,
        Some(CanonicalValue::Number(value)) => *value != 0.0,
        Some(CanonicalValue::String(value)) => !value.is_empty(),
        Some(CanonicalValue::Bool(true) | CanonicalValue::Array(_) | CanonicalValue::Object(_)) => {
            true
        }
    }
}

fn exists(value: Option<&CanonicalValue>) -> bool {
    match value {
        None | Some(CanonicalValue::Null) => false,
        Some(CanonicalValue::String(value)) => !value.is_empty(),
        Some(_) => true,
    }
}

fn json_values_equal(left: Option<&CanonicalValue>, right: Option<&CanonicalValue>) -> bool {
    let (Some(left), Some(right)) = (left, right) else {
        return false;
    };
    match (canonicalize_value(left), canonicalize_value(right)) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

pub(super) fn optional_values_equal(
    left: Option<&CanonicalValue>,
    right: Option<&CanonicalValue>,
) -> bool {
    match (left, right) {
        (None, None) => true,
        _ => json_values_equal(left, right),
    }
}

fn finite_number(value: Option<&CanonicalValue>, operator: &str) -> Result<f64, String> {
    match value {
        Some(CanonicalValue::Number(value)) if value.is_finite() => Ok(*value),
        _ => Err(format!(
            "TypeError: Expression {operator} operands must be finite numbers."
        )),
    }
}

fn scalar_text(value: Option<&CanonicalValue>) -> Result<String, String> {
    match value {
        None | Some(CanonicalValue::Null) => Ok(String::new()),
        Some(CanonicalValue::String(value)) => Ok(value.clone()),
        Some(CanonicalValue::Bool(value)) => Ok(value.to_string()),
        Some(CanonicalValue::Number(value)) => Ok(number_text(*value)),
        Some(CanonicalValue::Array(_) | CanonicalValue::Object(_)) => {
            Err("TypeError: Expression concat values must be JSON primitives.".to_owned())
        }
    }
}

fn contains(left: Option<&CanonicalValue>, right: Option<&CanonicalValue>) -> bool {
    match left {
        Some(CanonicalValue::String(left)) => left.contains(&javascript_string(right)),
        Some(CanonicalValue::Array(values)) => values
            .iter()
            .any(|item| json_values_equal(Some(item), right)),
        _ => false,
    }
}

fn in_collection(left: Option<&CanonicalValue>, right: Option<&CanonicalValue>) -> bool {
    match right {
        Some(CanonicalValue::Array(values)) => values
            .iter()
            .any(|item| json_values_equal(Some(item), left)),
        _ => false,
    }
}

fn javascript_string(value: Option<&CanonicalValue>) -> String {
    match value {
        None | Some(CanonicalValue::Null) => String::new(),
        Some(CanonicalValue::String(value)) => value.clone(),
        Some(CanonicalValue::Bool(value)) => value.to_string(),
        Some(CanonicalValue::Number(value)) => number_text(*value),
        Some(CanonicalValue::Object(_)) => "[object Object]".to_owned(),
        Some(CanonicalValue::Array(values)) => values
            .iter()
            .map(|value| javascript_string(Some(value)))
            .collect::<Vec<_>>()
            .join(","),
    }
}

fn number_text(value: f64) -> String {
    if value == 0.0 {
        "0".to_owned()
    } else {
        ryu_js::Buffer::new().format_finite(value).to_owned()
    }
}

fn relational(
    left: Option<&CanonicalValue>,
    right: Option<&CanonicalValue>,
    operator: &str,
) -> bool {
    let ordering = match (comparable(left), comparable(right)) {
        (Comparable::String(left), Comparable::String(right)) => {
            Some(left.encode_utf16().cmp(right.encode_utf16()))
        }
        (left, right) => {
            let left = comparable_number(left);
            let right = comparable_number(right);
            if left.is_nan() || right.is_nan() {
                None
            } else {
                left.partial_cmp(&right)
            }
        }
    };
    match operator {
        "gt" => ordering == Some(Ordering::Greater),
        "gte" => matches!(ordering, Some(Ordering::Greater | Ordering::Equal)),
        "lt" => ordering == Some(Ordering::Less),
        "lte" => matches!(ordering, Some(Ordering::Less | Ordering::Equal)),
        _ => false,
    }
}

enum Comparable<'a> {
    Undefined,
    Null,
    Bool(bool),
    Number(f64),
    String(&'a str),
}

fn comparable(value: Option<&CanonicalValue>) -> Comparable<'_> {
    match value {
        None | Some(CanonicalValue::Array(_) | CanonicalValue::Object(_)) => Comparable::Undefined,
        Some(CanonicalValue::Null) => Comparable::Null,
        Some(CanonicalValue::Bool(value)) => Comparable::Bool(*value),
        Some(CanonicalValue::Number(value)) => Comparable::Number(*value),
        Some(CanonicalValue::String(value)) => Comparable::String(value),
    }
}

fn comparable_number(value: Comparable<'_>) -> f64 {
    match value {
        Comparable::Undefined => f64::NAN,
        Comparable::Null => 0.0,
        Comparable::Bool(value) => u8::from(value) as f64,
        Comparable::Number(value) => value,
        Comparable::String(value) => javascript_number(value),
    }
}

fn javascript_number(value: &str) -> f64 {
    let value = value.trim();
    if value.is_empty() {
        return 0.0;
    }
    match value {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    if let Some(hex) = value
        .strip_prefix("0x")
        .or_else(|| value.strip_prefix("0X"))
    {
        return u64::from_str_radix(hex, 16)
            .map(|value| value as f64)
            .unwrap_or(f64::NAN);
    }
    if let Some(binary) = value
        .strip_prefix("0b")
        .or_else(|| value.strip_prefix("0B"))
    {
        return u64::from_str_radix(binary, 2)
            .map(|value| value as f64)
            .unwrap_or(f64::NAN);
    }
    if let Some(octal) = value
        .strip_prefix("0o")
        .or_else(|| value.strip_prefix("0O"))
    {
        return u64::from_str_radix(octal, 8)
            .map(|value| value as f64)
            .unwrap_or(f64::NAN);
    }
    value.parse::<f64>().unwrap_or(f64::NAN)
}
