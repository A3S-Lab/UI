import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { components } from "../src/ai/manifest/index.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkOnly = process.argv.includes("--check");

function pascal(value) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function labels(locale) {
  return locale === "zh"
    ? {
        action: "继续",
        content: "组件内容",
        current: "当前页面",
        details: "查看详情",
        field: "名称",
        option: "已就绪",
        status: "操作已完成",
        summary: "组件摘要",
      }
    : {
        action: "Continue",
        content: "Component content",
        current: "Current page",
        details: "View details",
        field: "Name",
        option: "Ready",
        status: "Action complete",
        summary: "Component summary",
      };
}

function sample(component, locale, framework) {
  const text = labels(locale);
  const name = pascal(component.slug);
  const react = framework === "react";
  const attributes = [];
  if (
    ["a", "brand-lockup", "message-citation"].includes(component.framework.tag)
  )
    attributes.push('href="#example"');
  if (
    [
      "aside",
      "dialog",
      "fieldset",
      "form",
      "nav",
      "ol",
      "section",
      "table",
    ].includes(component.framework.tag)
  )
    attributes.push(`aria-label="${component.name}"`);
  if (["input", "textarea"].includes(component.framework.tag))
    attributes.push(`aria-label="${text.field}"`);
  if (component.framework.tag === "textarea")
    attributes.push(
      react ? `defaultValue="${text.content}"` : `value="${text.content}"`,
    );
  if (component.slug === "tooltip") attributes.push('aria-label="Help"');
  const hook = component.events.length > 0 || component.methods.length > 0;
  if (hook)
    attributes.unshift(react ? "ref={control.ref}" : 'ref="componentRef"');

  let children = text.content;
  if (["input", "textarea"].includes(component.framework.tag)) children = null;
  else if (component.framework.tag === "select")
    children = `<option value="ready">${text.option}</option>`;
  else if (component.framework.tag === "details")
    children = `<summary>${text.details}</summary><div>${text.content}</div>`;
  else if (component.framework.tag === "dialog")
    children = `<div><header><h2>${text.summary}</h2></header><section>${text.content}</section><footer><button type="button">${text.action}</button></footer></div>`;
  else if (component.framework.tag === "form")
    children = `<label>${text.field}<input name="name" /></label><button type="submit">${text.action}</button>`;
  else if (component.framework.tag === "fieldset")
    children = `<legend>${text.summary}</legend><label><input type="radio" name="choice" /> ${text.option}</label>`;
  else if (component.framework.tag === "figure")
    children =
      component.slug === "image"
        ? `<img src="/logo.png" alt="A3S OS" /><figcaption>${text.summary}</figcaption>`
        : `<figcaption>${text.summary}</figcaption><pre><code>${text.content}</code></pre>`;
  else if (component.framework.tag === "nav")
    children = `<a href="#current" aria-current="page">${text.current}</a>`;
  else if (["ol", "ul"].includes(component.framework.tag))
    children = `<li>${text.content}</li>`;
  else if (component.framework.tag === "dl")
    children = `<div><dt>${text.field}</dt><dd>${text.content}</dd></div>`;
  else if (component.framework.tag === "pre")
    children = `<code>${text.content}</code>`;
  else if (component.slug === "table")
    children = `<table><caption>${text.summary}</caption><tbody><tr><th scope="row">${text.field}</th><td>${text.content}</td></tr></tbody></table>`;
  else if (component.slug === "radio-group")
    children = `<label><input type="radio" name="choice" /> ${text.option}</label>`;

  const open = `<${name}${attributes.length ? ` ${attributes.join(" ")}` : ""}`;
  return children === null ? `${open} />` : `${open}>${children}</${name}>`;
}

function frameworkSection(component, locale) {
  const zh = locale === "zh";
  const name = pascal(component.slug);
  const hook = component.events.length > 0 || component.methods.length > 0;
  const hookName = `use${name}`;
  const react = `import { ${name}${hook ? `, ${hookName}` : ""} } from "@a3s-lab/ui/react";

export function Example() {
${hook ? `  const control = ${hookName}();\n` : ""}  return (
    ${sample(component, locale, "react")}
  );
}`;
  const vue = `<script setup>
import { ${name}${hook ? `, ${hookName}` : ""} } from "@a3s-lab/ui/vue";
${hook ? `\nconst control = ${hookName}();\nconst componentRef = control.componentRef;` : ""}
</script>

<template>
  ${sample(component, locale, "vue")}
</template>`;
  const explanation = hook
    ? zh
      ? `\`${hookName}\` 订阅清单中声明的 DOM 事件，并且只调用清单中公开的方法。适配器不创建另一套框架专属状态。`
      : `\`${hookName}\` subscribes to manifest-declared DOM events and calls only public manifest methods. The adapter creates no second, framework-only state model.`
    : zh
      ? "适配器只替换指南中已记录的语义根元素，不增加包装层；内部标记继续使用上方 HTML 契约。"
      : "The adapter replaces only the documented semantic root and adds no wrapper; its children keep the HTML contract shown above.";

  return `

## React

\`\`\`tsx
${react}
\`\`\`

${explanation}

## Vue

\`\`\`vue
${vue}
\`\`\`

${explanation}
`;
}

function hasFrameworkGuide(source, framework) {
  const heading = new RegExp(`^## ${framework}$`, "mu");
  const tabProp = framework.toLowerCase();
  const frameworkTabs = new RegExp(
    `<FrameworkTabs\\b[\\s\\S]*?\\b${tabProp}=\\{`,
    "u",
  );
  return heading.test(source) || frameworkTabs.test(source);
}

const missing = [];
let written = 0;
for (const component of components) {
  for (const locale of ["en", "zh"]) {
    const filePath = path.join(
      projectRoot,
      "site",
      "docs",
      "next",
      locale,
      "components",
      `${component.slug}.mdx`,
    );
    const source = await readFile(filePath, "utf8");
    const hasReact = hasFrameworkGuide(source, "React");
    const hasVue = hasFrameworkGuide(source, "Vue");
    if (hasReact && hasVue) {
      const normalized = `${source.trimEnd()}\n`;
      if (!checkOnly && normalized !== source) {
        await writeFile(filePath, normalized);
        written += 1;
      }
      continue;
    }
    missing.push(`${locale}/${component.slug}`);
    if (!checkOnly) {
      await writeFile(
        filePath,
        `${source.trimEnd()}${frameworkSection(component, locale).trimEnd()}\n`,
      );
      written += 1;
    }
  }
}

if (checkOnly && missing.length > 0) {
  throw new Error(`Missing React/Vue component guides: ${missing.join(", ")}`);
}

console.log(
  checkOnly
    ? `Validated React and Vue guides for ${components.length} components in both locales.`
    : `Updated React and Vue sections or file endings in ${written} component guides.`,
);
