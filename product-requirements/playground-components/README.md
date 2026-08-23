# Playground Component Product Requirements

This directory contains one first-principles product requirements document for every PascalCase React component exported from `site/theme/components/playground`. These are internal deterministic composition fixtures, not additional public package APIs or product services.

- Active route components: 83
- Legacy-only, unmounted components: 11
- Total covered exports: 94
- Machine-readable mapping with one unique A3S Test assertion per export: `product-requirements/playground-component-coverage.json`
- Active route evidence: `tests/e2e/playground-route-contracts.acl`
- Legacy boundary evidence: `tests/e2e/playground-component-boundaries.acl`

Run `npm run generate:playground-component-contracts` after changing the export inventory or an intentional fixture contract. The check command rejects missing exports, orphaned PRDs, shallow requirements, stale scenario mappings, and active imports of legacy-only workspace components.
