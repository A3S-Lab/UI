# Contributing to A3S UI

A3S UI is maintained on `main`. Create a focused feature or fix branch, validate it locally, and open a pull request against `main`.

## Local setup

```bash
npm ci
npm ci --prefix site
```

## Development workflow

```bash
# Build distributable CSS, JavaScript, and templates.
npm run build

# Start the Rspress documentation site.
npm run docs:dev

# Build and verify the static documentation site.
npm run docs:build
```

Keep component APIs semantic and framework-agnostic. Prefer native elements and CSS state, adding vanilla JavaScript only when the browser does not provide the required behavior.

When a public component changes, update both `site/docs/next/zh` and `site/docs/next/en`. Stable version trees should change only for corrections that apply to that published contract.

Use A3S Test locally for interaction and release checks. Do not add A3S Test to the GitHub Pages workflow.

## Pull requests

- Keep one primary concern per pull request.
- Update component previews, parameters, states, and accessibility notes with the implementation.
- Run `npm run build` and `npm run docs:build` before submission.
- Do not commit generated `dist`, `templates`, or `site/doc_build` output.

A3S UI builds on [Basecoat](https://github.com/hunvreus/basecoat). Changes to inherited primitives should preserve that lineage and document intentional differences from upstream shadcn/ui concepts.
