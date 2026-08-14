import { applicationComponents } from "./application.js";
import { dataComponents, feedbackComponents } from "./display.js";
import { navigationComponents, overlayComponents } from "./navigation.js";
import {
  actionComponents,
  formComponents,
  utilityComponents,
} from "./primitives.js";

export const components = Object.freeze([
  ...actionComponents,
  ...formComponents,
  ...navigationComponents,
  ...overlayComponents,
  ...feedbackComponents,
  ...dataComponents,
  ...applicationComponents,
  ...utilityComponents,
]);

export const componentMap = Object.freeze(
  Object.fromEntries(components.map((component) => [component.slug, component])),
);

export function getComponent(slug) {
  return componentMap[slug];
}

export function listComponents(category) {
  return category
    ? components.filter((component) => component.category === category)
    : [...components];
}
