import { defineComponent } from "../define.js";

export const harnessComponents = [
  defineComponent({
    slug: "device-simulator",
    name: "Device Simulator",
    category: "harness",
    selector: ".device-simulator",
    tag: "section",
    className: "device-simulator",
    parts: {
      action:
        "[data-device-simulator-actions] button, [data-device-simulator-navigation] button, :scope > footer button",
      command: "[data-device-simulator-command]",
      control:
        "[data-device-simulator-select], [data-device-simulator-width], [data-device-simulator-height], [data-device-simulator-orientation] button",
      input: "[data-device-simulator-url]",
      preview: "[data-device-simulator-preview]",
      status:
        "[data-device-simulator-status], [data-device-simulator-screen-status]",
      viewport: "[data-device-simulator-workspace]",
    },
    actionParts: {
      click: "action",
      fill: "input",
      focus: "control",
      press: "action",
      select: "control",
      type: "input",
      wheel: "viewport",
    },
    actions: ["click", "fill", "focus", "press", "select", "type", "wheel"],
    events: [
      "a3s:device-change",
      "a3s:device-navigate",
      "a3s:device-preview-request",
      "basecoat:initialized",
    ],
    states: ["ready", "loading", "error"],
  }),
];
