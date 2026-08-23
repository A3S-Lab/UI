# Component Product Requirements

This directory contains one first-principles product requirements document for every public A3S UI component. The machine manifest, bilingual component guides, interaction scenarios, responsive evidence scenarios, and these PRDs form one release contract.

- Public components: 116
- Source of component truth: `src/ai/manifest/index.js`
- Product decisions: `COMPONENT_OPTIMIZATION_PLAN.md`
- Machine-readable mapping: `product-requirements/component-coverage.json`
- Deterministic visual contract: `tests/e2e/component-contracts.acl`

Run `npm run generate:component-contracts` after an intentional contract change. Run `npm run check:component-contracts` to reject missing, stale, duplicated, or shallow coverage before A3S Test admission.
