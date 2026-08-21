# A3S Form Architecture

A3S Form is an embeddable, AI-native form system. It unifies form definition, visual authoring, runtime rendering, and coding-agent changes around one versioned `FormDocument`, while durable storage, identity, authorization, data providers, and side effects remain host responsibilities.

## System structure

```text
                 Human authors and coding agents
           Designer / CLI / $a3s-form / FormPatch
                              |
                    reviewed bounded change
                              v
  +------------------------------------------------------------------+
  |                           A3S Form                                |
  |                                                                  |
  |  Designer <-> canonical FormDocument -> portable Rust Form Core  |
  |                                            |                     |
  |                                  immutable FormPlan              |
  |                                            |                     |
  |                         +------------------+------------------+  |
  |                         v                  v                  v  |
  |                   React Renderer      Vue adapter      Web Component
  +-------------------------+------------------+------------------+--+
                            | controlled value and host ports
                            v
  +------------------------------------------------------------------+
  |                         Host boundary                            |
  | A3S Cloud / workflow host / standalone product                   |
  | identity, policy, persistence, tasks, providers, actions, audit  |
  +------------------------------------------------------------------+
```

The native Rust core is the semantic authority. The package-embedded WASM build supplies the same compiler and submitted-value evaluator to browsers, Node, Workers, and the CLI. Former TypeScript compiler and evaluator implementations remain conformance references and do not define an independent production interpretation.

## Invariants

1. Designer, Renderer, CLI, Worker, native hosts, and agents use compiler-produced `FormPlan` semantics rather than interpreting raw JSON independently.
2. `FormDocument` is the sole form-definition source. Its revision supports optimistic evolution, and its canonical SHA-256 digest pins published content.
3. Renderer is controlled. Values, errors, business validation, persistence, identity, authorization, and action side effects belong to the host.
4. Agent changes are typed `FormPatch` values bound to an exact base revision. A conflict fails instead of overwriting newer work.
5. Documents execute no arbitrary JavaScript. Widgets, data sources, actions, and output mappings use host-approved registry keys.
6. A durable submission is validated against the original request, exact Form release, and current protected task context. A detached browser value is never sufficient.
7. A3S Form does not persist `HumanTask`, `FormSubmission`, or workflow state and never resumes a Flow hook directly.

## Compilation pipeline

```text
portable input inspection
  -> structural and resource limits
  -> Schema Profile 1 validation
  -> UI/schema reference validation
  -> rule dependency graph and cycle detection
  -> host capability validation
  -> normalization and canonical digest
  -> immutable FormDocument and FormPlan
```

The JavaScript boundary rejects cyclic graphs, accessors, proxies, unsupported prototypes, sparse arrays, non-finite numbers, excessive depth, and excessive graph entries before semantic compilation. Native and WASM adapters accept bounded canonical bytes and return the same compiler revision, normalized document, digest, plan, and diagnostics.

## Submitted-value evaluation pipeline

```text
portable plan and value inspection
  -> computed dependency order and concrete row expansion
  -> stale-output removal and failure propagation
  -> Schema Profile 1 value validation
  -> validate-rule evaluation and localized diagnostics
  -> hidden-wizard-page filtering
  -> canonical normalized value, trace, and errors
```

The versioned `evaluate-request/v1alpha1` and `evaluate-response/v1alpha1` byte protocol is implemented by the native library, CLI, and package-embedded WASM adapter. Public `evaluateFormValue` calls that adapter; durable workflow and interaction acceptance therefore cannot fall back to a browser-only TypeScript interpretation. See [Portable submitted-value evaluation](value-evaluation.md).

`compiler-client` may move compilation into a cancellable Web Worker. Request identities prevent late responses from replacing a newer document. The core has no database, network, Cloud, or UI dependency, so hosts may run it as a stateless library or isolated task.

## Form document

```text
FormDocument
|- schema          closed A3S Form Schema Profile 1
|- ui              nodes, layouts, widget keys, hints, and options
|- rules           bounded visible/enabled/computed/validate expressions
|- dataSources     declarative host-resolved requests
|- actions         declarative host-resolved actions
|- metadata        title, locale, ownership, and compatibility information
|- revision        optimistic version
`- digest          canonical SHA-256 of publishable content
```

Values are not part of `FormDocument`. Keeping definitions and tenant business data in separate lifecycles prevents a form publication from mutating an active task or submission.

## Workflow node configuration

A workflow node stores a configuration-mode `FormRef { uri, revision, digest, mode }` and a controlled JSON value. `validateWorkflowNodeConfiguration` recompiles the published document, verifies the pinned revision and digest, evaluates computed rules, and validates the resulting value. It does not need A3S Cloud or Flow runtime services.

## Durable human interaction

Durable interaction uses three v1 wire identities:

- `a3s.dev/form-release-ref/v1`
- `a3s.dev/form-interaction-request/v1`
- `a3s.dev/form-interaction-submission/v1`

`FormReleaseRef` pins organization, project, form, release, URI, revision, digest, compiler revision, Schema Profile, and interaction mode.

`FormInteractionRequest` binds:

- Cloud WorkflowRun and Flow run identities;
- step identity and attempt generation;
- HumanTask and Flow hook identities;
- the exact `FormReleaseRef`;
- assignment-policy identity, revision, digest, and claimed principal;
- task version, creation time, due time, and expiry;
- allowed outcomes and a bounded output-mapping policy;
- maximum canonical value bytes and optional initial value; and
- a SHA-256 digest over the complete request content.

`FormInteractionSubmission` repeats the protected identities and binds the request digest, task version, authenticated principal, outcome, idempotency key, canonical submission time, value, and value digest. `validateInteractionSubmission` also receives current time, current authorization, task status, expected task version, and current claimant from the protected host command path.

Validation rejects unsupported versions, unknown fields, cross-run or cross-step drift, changed Form/compiler/schema identities, assignment drift, stale versions, revoked or non-claimant access, terminal or expired tasks, unsupported outcomes, non-canonical timestamps, malformed digests, adversarial JavaScript values, and raw or computed values beyond the request limit. Accepted values are produced by the native submitted-value evaluator after the exact Form release is compiled again inside the protected command path.

TypeScript and native Rust use [`interaction-contract-v1.json`](../tests/conformance/interaction-contract-v1.json) to prove byte-identical canonical request/value content and SHA-256 digests.

Native Rust, direct WASM, the TypeScript conformance reference, and the public Node adapter use [`value-evaluation-v1.json`](../tests/conformance/value-evaluation-v1.json) to prove byte-identical derived values, traces, and validation errors.

## Ownership at the integration boundary

| Concern | Owner |
| --- | --- |
| Document semantics, compilation, canonicalization, validation, and interaction wire types | A3S Form Core |
| Controlled rendering, accessibility, locale, and host capability ports | A3S Form UI |
| Form drafts, immutable releases, submissions, retention, and publication policy | Host or A3S Cloud Forms context |
| WorkflowRun, HumanTask, assignment, authorization, decision, and task version | Host or A3S Cloud Workflow context |
| Durable execution history, timers, retries, and the active hook | A3S Flow |
| Queue processing and task delivery | A3S Boot |
| Relational access and migrations | A3S ORM / PostgreSQL |

The browser receives a Cloud task identity and renderable Form release, not an internal Flow callback token. Cloud must lock and validate its task aggregate, commit the immutable submission and decision, then resume Flow through its own idempotent Outbox and recovery path.

## Deployment and scaling boundaries

| Component | State model | Deployment guidance |
| --- | --- | --- |
| Native/WASM Form Core | Stateless and deterministic | Browser Worker, local process, Cloud service process, or isolated Runtime task |
| React/Vue/Web Component Renderer | Controlled client state and cancellable host requests | Embedded in the host frontend |
| Designer | Local editing state plus a host-owned draft | Load on demand; save through the host |
| Data-source/action registries | Host business state | Authorize and scale in Cloud or product services |
| Form lifecycle and HumanTask | Durable host business state | Persist through the host's transactional repository boundary |
| Flow hook and execution history | Durable orchestration state | Persist and recover through A3S Flow |

This separation keeps Form portable while allowing compilation, provider calls, business persistence, task processing, and orchestration to scale and recover under their owning systems.
