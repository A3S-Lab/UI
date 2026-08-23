# Product Requirements and Test Traceability

This directory is the product-and-test source of truth for the reusable UI catalog and its deterministic composition fixtures. A route, export, screenshot, or selector alone does not count as product coverage.

## Inventory

| Scope | PRDs | Machine index | Deterministic evidence |
| --- | ---: | --- | --- |
| Public components | 116 | `component-coverage.json` | Unique component interaction scenario plus `tests/e2e/component-contracts.acl` |
| Playground exports | 94 | `playground-component-coverage.json` | Active behavior and route scenarios, or an explicit legacy non-mounting scenario |
| Harness and Playground surfaces | 20 | `surface-coverage.json` | Unique surface scenario with desktop and compact evidence |
| Removed Workflow boundary | 0 retained | — | 11 recoverable-not-found scenarios in `tests/e2e/workflow-removal-boundaries.acl` |

The current ACL inventory contains 30 suites and 378 scenarios. Those scenarios declare 3,550 assertions, 787 screenshots, 191 accessibility captures, 247 console captures, and 247 page-error captures.

## Required PRD structure

Each PRD contains exactly one section for the user problem, product boundary, states, interaction contract, responsive behavior, accessibility, failure, empty, and loading cases, acceptance criteria, and A3S Test mapping. The acceptance section contains at least five independently testable criteria and component-specific adversarial reasoning. Placeholder or duplicated requirements fail generation.

## Validation

```bash
npm run check:component-contracts
npm run check:playground-component-contracts
npm run check:surface-contracts
npm run check:framework-docs
npm run test:e2e:a3s:check
npm run test:e2e:a3s
```

The check commands prove traceability and ACL admission. The final command runs the real browser evidence and must distinguish product assertions from browser-driver or evidence-transport failures; visual requirements may not be removed to make an infrastructure failure pass.
