const requiredPrdSections = [
  "User problem",
  "Product boundary",
  "States",
  "Interaction contract",
  "Responsive behavior",
  "Accessibility",
  "Failure, empty, and loading cases",
  "Acceptance criteria",
  "A3S Test mapping",
];

const unfinishedPattern =
  /\b(?:TODO|TBD|FIXME|XXX|lorem ipsum|coming soon|to be determined|replace me)\b/iu;

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

export function assertSubstantiveField({
  label,
  minLength,
  value,
}) {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new Error(
      `${label} must contain at least ${minLength} characters of component-specific product reasoning.`,
    );
  }
  if (unfinishedPattern.test(value)) {
    throw new Error(`${label} contains unfinished or placeholder language.`);
  }
}

export function assertPrdQuality({
  label,
  minLength = 3600,
  source,
  uniqueFragments = [],
}) {
  if (source.length < minLength) {
    throw new Error(
      `${label} is too shallow (${source.length} characters; expected at least ${minLength}).`,
    );
  }
  if (unfinishedPattern.test(source)) {
    throw new Error(`${label} contains unfinished or placeholder language.`);
  }

  for (const section of requiredPrdSections) {
    const count = countMatches(
      source,
      new RegExp(`^## ${section.replaceAll("?", "\\?")}$`, "gmu"),
    );
    if (count !== 1) {
      throw new Error(
        `${label} must contain exactly one \`## ${section}\` section; found ${count}.`,
      );
    }
  }

  const acceptanceHeading = "## Acceptance criteria\n\n";
  const acceptanceStart = source.indexOf(acceptanceHeading);
  const acceptanceEnd = source.indexOf(
    "\n## ",
    acceptanceStart + acceptanceHeading.length,
  );
  const acceptance =
    acceptanceStart >= 0
      ? source.slice(
          acceptanceStart + acceptanceHeading.length,
          acceptanceEnd >= 0 ? acceptanceEnd : source.length,
        )
      : "";
  const acceptanceItems = acceptance
    ? countMatches(acceptance, /^-\s+/gmu)
    : 0;
  if (acceptanceItems < 5) {
    throw new Error(
      `${label} must contain at least five independently testable acceptance criteria.`,
    );
  }

  for (const fragment of uniqueFragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} is missing required product-specific text: ${fragment}`);
    }
  }
}

export function assertUniqueValues(records, field, label) {
  const seen = new Map();
  for (const record of records) {
    const value = record[field];
    const previous = seen.get(value);
    if (previous) {
      throw new Error(
        `${label} must be unique; ${JSON.stringify(value)} is used by ${previous} and ${record.exportName ?? record.name ?? "unknown"}.`,
      );
    }
    seen.set(value, record.exportName ?? record.name ?? "unknown");
  }
}

export { requiredPrdSections };
