import { defineComponent } from "../define.js";

export const harnessComponents = [
  defineComponent({
    slug: "file-explorer",
    name: "File Explorer",
    category: "harness",
    selector: ".file-explorer",
    tag: "section",
    className: "file-explorer",
    parts: {
      action:
        "[data-file-explorer-actions] button, [data-file-explorer-toolbar] button",
      input: "[data-file-explorer-search], [data-file-editor]",
      state: "[data-file-explorer-state]",
      status: "[data-file-status], [data-file-dirty]",
      toolbar: "[data-file-explorer-toolbar]",
      tree: ".tree[role=tree]",
      viewport: "[data-file-explorer-viewport]",
    },
    actions: ["click", "fill", "focus", "press", "select", "type", "wheel"],
    actionParts: {
      click: "action",
      fill: "input",
      focus: "input",
      press: "action",
      select: "tree",
      type: "input",
      wheel: "viewport",
    },
    events: ["a3s:context-menu-select", "a3s:file-action", "a3s:tree-toggle"],
    states: ["ready", "loading", "empty", "error", "readonly", "renaming"],
  }),
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
