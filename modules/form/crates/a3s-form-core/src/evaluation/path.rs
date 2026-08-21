use crate::CanonicalValue;

pub(super) fn get_at_path<'a>(value: &'a CanonicalValue, path: &str) -> Option<&'a CanonicalValue> {
    if path.is_empty() {
        return Some(value);
    }
    let mut current = value;
    for segment in path.split('.') {
        current = match current {
            CanonicalValue::Object(entries) => entries
                .iter()
                .find_map(|(key, value)| (key == segment).then_some(value))?,
            CanonicalValue::Array(values) => values.get(array_index(segment)?)?,
            _ => return None,
        };
    }
    Some(current)
}

pub(super) fn set_at_path(
    value: &CanonicalValue,
    path: &str,
    next: CanonicalValue,
) -> CanonicalValue {
    let parts = path
        .split('.')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        return next;
    }
    let mut copy = value.clone();
    if set_segments(&mut copy, &parts, next).is_err() {
        value.clone()
    } else {
        copy
    }
}

fn set_segments(
    current: &mut CanonicalValue,
    parts: &[&str],
    next: CanonicalValue,
) -> Result<(), ()> {
    let Some((part, remaining)) = parts.split_first() else {
        *current = next;
        return Ok(());
    };
    if remaining.is_empty() {
        return set_child(current, part, next);
    }
    let child = child_mut(current, part, remaining[0])?;
    set_segments(child, remaining, next)
}

fn child_mut<'a>(
    current: &'a mut CanonicalValue,
    part: &str,
    next_part: &str,
) -> Result<&'a mut CanonicalValue, ()> {
    let replacement = || {
        if array_index(next_part).is_some() {
            CanonicalValue::Array(Vec::new())
        } else {
            CanonicalValue::Object(Vec::new())
        }
    };
    match current {
        CanonicalValue::Object(entries) => {
            let index = entries.iter().position(|(key, _)| key == part);
            let index = match index {
                Some(index) => index,
                None => {
                    entries.push((part.to_owned(), replacement()));
                    entries.len() - 1
                }
            };
            if !matches!(
                entries[index].1,
                CanonicalValue::Object(_) | CanonicalValue::Array(_)
            ) {
                entries[index].1 = replacement();
            }
            Ok(&mut entries[index].1)
        }
        CanonicalValue::Array(values) => {
            let index = array_index(part).ok_or(())?;
            extend_array(values, index);
            if !matches!(
                values[index],
                CanonicalValue::Object(_) | CanonicalValue::Array(_)
            ) {
                values[index] = replacement();
            }
            Ok(&mut values[index])
        }
        _ => Err(()),
    }
}

fn set_child(current: &mut CanonicalValue, part: &str, next: CanonicalValue) -> Result<(), ()> {
    match current {
        CanonicalValue::Object(entries) => {
            if let Some((_, value)) = entries.iter_mut().find(|(key, _)| key == part) {
                *value = next;
            } else {
                entries.push((part.to_owned(), next));
            }
            Ok(())
        }
        CanonicalValue::Array(values) => {
            let index = array_index(part).ok_or(())?;
            extend_array(values, index);
            values[index] = next;
            Ok(())
        }
        _ => Err(()),
    }
}

fn extend_array(values: &mut Vec<CanonicalValue>, index: usize) {
    if values.len() <= index {
        values.resize(index + 1, CanonicalValue::Null);
    }
}

pub(super) fn remove_at_path(value: &CanonicalValue, path: &str) -> CanonicalValue {
    let parts = path
        .split('.')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        return CanonicalValue::Object(Vec::new());
    }
    let mut copy = value.clone();
    remove_segments(&mut copy, &parts);
    copy
}

fn remove_segments(current: &mut CanonicalValue, parts: &[&str]) {
    let Some((part, remaining)) = parts.split_first() else {
        return;
    };
    if remaining.is_empty() {
        match current {
            CanonicalValue::Object(entries) => {
                if let Some(index) = entries.iter().position(|(key, _)| key == part) {
                    entries.remove(index);
                }
            }
            CanonicalValue::Array(values) => {
                if let Some(index) = array_index(part).filter(|index| *index < values.len()) {
                    values.remove(index);
                }
            }
            _ => {}
        }
        return;
    }
    let child = match current {
        CanonicalValue::Object(entries) => entries
            .iter_mut()
            .find_map(|(key, value)| (key == part).then_some(value)),
        CanonicalValue::Array(values) => array_index(part).and_then(|index| values.get_mut(index)),
        _ => None,
    };
    if let Some(child) = child {
        if matches!(child, CanonicalValue::Object(_) | CanonicalValue::Array(_)) {
            remove_segments(child, remaining);
        }
    }
}

pub(super) fn expand_value_path_template(value: &CanonicalValue, template: &str) -> Vec<String> {
    let segments = template.split('.').collect::<Vec<_>>();
    if segments.is_empty() || segments.iter().any(|segment| segment.is_empty()) {
        return Vec::new();
    }
    let mut paths = Vec::new();
    let mut concrete = Vec::with_capacity(segments.len());
    expand(Some(value), &segments, 0, &mut concrete, &mut paths);
    paths
}

fn expand(
    current: Option<&CanonicalValue>,
    segments: &[&str],
    index: usize,
    concrete: &mut Vec<String>,
    paths: &mut Vec<String>,
) {
    if index == segments.len() {
        paths.push(concrete.join("."));
        return;
    }
    let segment = segments[index];
    if segment == "*" {
        let Some(CanonicalValue::Array(values)) = current else {
            return;
        };
        for (item_index, item) in values.iter().enumerate() {
            concrete.push(item_index.to_string());
            expand(Some(item), segments, index + 1, concrete, paths);
            concrete.pop();
        }
        return;
    }
    concrete.push(segment.to_owned());
    let next = current.and_then(|value| match value {
        CanonicalValue::Object(entries) => entries
            .iter()
            .find_map(|(key, value)| (key == segment).then_some(value)),
        CanonicalValue::Array(values) => array_index(segment).and_then(|index| values.get(index)),
        _ => None,
    });
    expand(next, segments, index + 1, concrete, paths);
    concrete.pop();
}

pub(super) fn resolve_value_path_template(template: &str, indices: &[usize]) -> Option<String> {
    let mut index = 0;
    let mut resolved = Vec::new();
    for segment in template.split('.') {
        if segment == "*" {
            let value = indices.get(index)?;
            resolved.push(value.to_string());
            index += 1;
        } else {
            resolved.push(segment.to_owned());
        }
    }
    Some(resolved.join("."))
}

pub(super) fn match_value_path_template(template: &str, path: &str) -> Option<Vec<usize>> {
    let template_parts = template.split('.').collect::<Vec<_>>();
    let path_parts = path.split('.').collect::<Vec<_>>();
    if template_parts.len() != path_parts.len() {
        return None;
    }
    let mut indices = Vec::new();
    for (template, candidate) in template_parts.into_iter().zip(path_parts) {
        if template == "*" {
            indices.push(array_index(candidate)?);
        } else if template != candidate {
            return None;
        }
    }
    Some(indices)
}

fn array_index(segment: &str) -> Option<usize> {
    if segment.is_empty() || (segment.len() > 1 && segment.starts_with('0')) {
        return None;
    }
    let index = segment.parse::<usize>().ok()?;
    (index.to_string() == segment).then_some(index)
}
