export function defineComponent({
  actionParts = {},
  actions = [],
  attributes = {},
  category,
  className = "",
  events = [],
  name,
  parts = {},
  selector,
  slug,
  states = [],
  tag = "div",
}) {
  const testSelector = `[data-a3s-components~="${slug}"]`;
  const partOwnerSelector = (part) =>
    `[data-a3s-part-owners~="${slug}.${part}"]`;
  const partSelectors = Object.fromEntries(
    Object.keys(parts).map((part) => [
      part,
      `${testSelector}${partOwnerSelector(part)}, ${testSelector} ${partOwnerSelector(part)}`,
    ]),
  );
  const actionPartPreferences = {
    check: ["option", "control", "scope", "input"],
    click: ["action", "trigger", "submit", "control", "option", "tab"],
    drag: ["separator"],
    fill: ["input", "control", "search"],
    focus: ["input", "control", "trigger", "action", "viewport"],
    hover: ["trigger", "action"],
    press: ["trigger", "input", "control", "action", "tab", "separator"],
    select: ["control", "option", "input"],
    type: ["input", "control", "search"],
    uncheck: ["option", "control", "scope", "input"],
    wheel: ["viewport", "content", "list", "results"],
  };
  const actionTargets = Object.fromEntries(
    actions.map((action) => {
      const preferredPart = actionParts[action];
      if (preferredPart && !parts[preferredPart]) {
        throw new Error(
          `${slug}.${action} targets unknown part ${preferredPart}.`,
        );
      }
      const part =
        preferredPart ??
        actionPartPreferences[action]?.find((name) => parts[name]);
      const interactiveSelector = `${testSelector}:is(button, input, select, textarea, a[href], summary, [tabindex]:not([tabindex="-1"]), [contenteditable=true]), ${testSelector} :is(button, input, select, textarea, a[href], summary, [tabindex]:not([tabindex="-1"]), [contenteditable=true])`;
      return [
        action,
        Object.freeze({
          part: part ?? null,
          selector: part
            ? partSelectors[part]
            : ["hover", "wheel"].includes(action)
              ? testSelector
              : interactiveSelector,
        }),
      ];
    }),
  );
  const stateSelectors = Object.fromEntries(
    states.map((state) => [
      state,
      `${testSelector}[data-a3s-state~="${state}"]`,
    ]),
  );
  return Object.freeze({
    actions: Object.freeze([...actions]),
    category,
    events: Object.freeze([...events]),
    framework: Object.freeze({
      attributes: Object.freeze({ ...attributes }),
      className,
      tag,
    }),
    name,
    parts: Object.freeze({ ...parts }),
    selector,
    slug,
    states: Object.freeze([...states]),
    test: Object.freeze({
      actionTargets: Object.freeze(actionTargets),
      actions: Object.freeze(
        Object.fromEntries(
          Object.entries(actionTargets).map(([action, target]) => [
            action,
            target.selector,
          ]),
        ),
      ),
      parts: Object.freeze(partSelectors),
      readySelector: `${testSelector}[data-a3s-state]`,
      selector: testSelector,
      states: Object.freeze(stateSelectors),
    }),
    version: 2,
  });
}
