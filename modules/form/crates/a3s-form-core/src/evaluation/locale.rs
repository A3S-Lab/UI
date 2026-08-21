use crate::CanonicalValue;

use super::protocol::{EvaluationLocaleCatalogOverride, FORM_LOCALE_CATALOG_API_VERSION};

#[derive(Clone)]
pub(super) struct ValidationMessages {
    pub validation_type: String,
    pub validation_min_length: String,
    pub validation_max_length: String,
    pub validation_pattern: String,
    pub validation_invalid_pattern: String,
    pub validation_format: String,
    pub validation_minimum: String,
    pub validation_maximum: String,
    pub validation_multiple_of: String,
    pub validation_const: String,
    pub validation_enum: String,
    pub validation_min_items: String,
    pub validation_max_items: String,
    pub validation_unique_items: String,
    pub validation_required: String,
    pub validation_additional_properties: String,
    pub validation_rule: String,
}

impl ValidationMessages {
    pub(super) fn resolve(locale: &str, catalog: Option<&EvaluationLocaleCatalogOverride>) -> Self {
        let language = locale
            .split('-')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        let mut messages = if language == "zh" {
            Self::chinese()
        } else {
            Self::english()
        };
        if let Some(catalog) =
            catalog.filter(|catalog| catalog.api_version == FORM_LOCALE_CATALOG_API_VERSION)
        {
            messages.apply_override(&catalog.messages);
        }
        messages
    }

    fn english() -> Self {
        Self {
            validation_type: "Expected {type}.".to_owned(),
            validation_min_length: "Enter at least {minimum} characters.".to_owned(),
            validation_max_length: "Enter no more than {maximum} characters.".to_owned(),
            validation_pattern: "Enter a value in the required format.".to_owned(),
            validation_invalid_pattern: "The schema contains an invalid regular expression."
                .to_owned(),
            validation_format: "The value must match the {format} format.".to_owned(),
            validation_minimum: "The value must be at least {minimum}.".to_owned(),
            validation_maximum: "The value must be no more than {maximum}.".to_owned(),
            validation_multiple_of: "The value must be a multiple of {multipleOf}.".to_owned(),
            validation_const: "The value must match the required constant.".to_owned(),
            validation_enum: "Select an allowed option.".to_owned(),
            validation_min_items: "Add at least {minimum} items.".to_owned(),
            validation_max_items: "Add no more than {maximum} items.".to_owned(),
            validation_unique_items: "Items must be unique.".to_owned(),
            validation_required: "This field is required.".to_owned(),
            validation_additional_properties: "Additional properties are not allowed.".to_owned(),
            validation_rule: "The value did not pass the business rule.".to_owned(),
        }
    }

    fn chinese() -> Self {
        Self {
            validation_type: "值类型必须是 {type}。".to_owned(),
            validation_min_length: "至少输入 {minimum} 个字符。".to_owned(),
            validation_max_length: "最多输入 {maximum} 个字符。".to_owned(),
            validation_pattern: "输入内容格式不正确。".to_owned(),
            validation_invalid_pattern: "Schema 中的正则表达式无效。".to_owned(),
            validation_format: "输入值必须符合 {format} 格式。".to_owned(),
            validation_minimum: "数值不能小于 {minimum}。".to_owned(),
            validation_maximum: "数值不能大于 {maximum}。".to_owned(),
            validation_multiple_of: "数值必须是 {multipleOf} 的倍数。".to_owned(),
            validation_const: "输入值必须符合指定常量。".to_owned(),
            validation_enum: "请选择允许的选项。".to_owned(),
            validation_min_items: "至少需要 {minimum} 项。".to_owned(),
            validation_max_items: "最多允许 {maximum} 项。".to_owned(),
            validation_unique_items: "每一项都必须不同。".to_owned(),
            validation_required: "此项为必填项。".to_owned(),
            validation_additional_properties: "不允许未声明的字段。".to_owned(),
            validation_rule: "输入未通过业务规则校验。".to_owned(),
        }
    }

    fn apply_override(&mut self, input: &CanonicalValue) {
        macro_rules! replace {
            ($field:ident, $key:literal) => {
                if let Some(value) = input.get($key).and_then(CanonicalValue::as_str) {
                    self.$field = value.to_owned();
                }
            };
        }
        replace!(validation_type, "validationType");
        replace!(validation_min_length, "validationMinLength");
        replace!(validation_max_length, "validationMaxLength");
        replace!(validation_pattern, "validationPattern");
        replace!(validation_invalid_pattern, "validationInvalidPattern");
        replace!(validation_format, "validationFormat");
        replace!(validation_minimum, "validationMinimum");
        replace!(validation_maximum, "validationMaximum");
        replace!(validation_multiple_of, "validationMultipleOf");
        replace!(validation_const, "validationConst");
        replace!(validation_enum, "validationEnum");
        replace!(validation_min_items, "validationMinItems");
        replace!(validation_max_items, "validationMaxItems");
        replace!(validation_unique_items, "validationUniqueItems");
        replace!(validation_required, "validationRequired");
        replace!(
            validation_additional_properties,
            "validationAdditionalProperties"
        );
        replace!(validation_rule, "validationRule");
    }
}

pub(super) fn format_message(template: &str, variables: &[(&str, String)]) -> String {
    let mut output = String::with_capacity(template.len());
    let bytes = template.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'{' {
            if let Some(relative_end) = template[index + 1..].find('}') {
                let end = index + 1 + relative_end;
                let name = &template[index + 1..end];
                let valid_name = name.chars().enumerate().all(|(position, character)| {
                    if position == 0 {
                        character.is_ascii_alphabetic()
                    } else {
                        character.is_ascii_alphanumeric()
                    }
                });
                if valid_name {
                    if let Some((_, value)) = variables.iter().find(|(key, _)| *key == name) {
                        output.push_str(value);
                        index = end + 1;
                        continue;
                    }
                }
            }
        }
        let Some(character) = template[index..].chars().next() else {
            break;
        };
        output.push(character);
        index += character.len_utf8();
    }
    output
}
