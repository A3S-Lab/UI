# Runtime performance budgets

`npm run form:test:performance` builds representative forms with 100, 500, and 1,000 total UI nodes. It measures four paths against explicit CI budgets:

| Nodes | Compile | Validate and compute | Incremental compute | Server render |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 100 ms | 50 ms | 15 ms | 150 ms |
| 500 | 300 ms | 300 ms | 50 ms | 800 ms |
| 1,000 | 700 ms | 1,200 ms | 120 ms | 1,800 ms |

The script reports median timings after warm-up. Budgets are intentionally above normal local timings so shared CI variance does not create noise, while large regressions still fail the build.

Runtime updates use two compiled indexes:

- `ruleDependencies` caches the exact value paths read by every rule;
- `nodeSubscriptions` combines a field's own value path, targeted rule paths, and declared data-source dependencies.

Computed rules reuse cached outputs when their dependency snapshots match. React fields and repeaters skip parent-driven renders when their subscribed values, errors, validation state, host adapter, locale, and registries are unchanged. Dynamic templates such as `routes.*.match` resolve against the current row indices before comparison, so editing one row does not subscribe every repeated field to every sibling value. Layout nodes continue to render so changed props reach subscribed descendants. Custom node-registry renderers receive the entire form value and remain conservatively unmemoized until they declare an explicit dependency contract.

Run the gate after the package build:

```bash
npm run build
npm run form:test:performance
```
