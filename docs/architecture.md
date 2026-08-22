# Architecture

A high-level tour of how the app is wired. Keep this doc honest as the
codebase evolves.

## High level

- **SvelteKit 2** (Svelte 5) on Node 24 (`@sveltejs/adapter-node`).
- One **AppContext per process**, built at boot from environment
  variables, then **wrapped per request** in AsyncLocalStorage so any
  server code can access services via thin accessors.
- **No database.** Day-one services are `LoggerService`, `TimeService`,
  `IdService`. Domain folders live under
  `src/lib/server/domain/<feature>/` — today: `wallet-crypto`,
  `wallet-client`, `issuer-runner`, `wallet-runner`, `exchange-runner`,
  `scenario-runner` (credential recipes, presentation requests, the
  `resolveIssuingContext` seam, the `deliver-direct` local signer —
  `scenarioRunner.deliverDirect`, which signs one recipe with an
  ephemeral did:key issuer for a file the operator hands over — and the
  `present-to-verifier` driver `scenarioRunner.present`, which presents a
  signed recipe to the operator's verifier over a live exchange, and the
  `receive-from-issuer` driver `scenarioRunner.receive`, which takes delivery of
  a credential the operator's _own_ issuer produced),
  `verifier-present` (the shared holder-side present primitives — one leaf per
  live transport, `present-to-vcalm-verifier` and `present-to-oid4-verifier`,
  each independent of both `scenario-runner` and `verifier-runner`; the OID4
  leaf inspects the pasted authorization request for the floor **and** submits
  the credential in one call, since OID4's floor does not ride on a fetch the
  way VCALM's does), `issuer-receive` (its mirror image — the shared
  **recipient**-side intake primitives, `receive-direct`,
  `receive-from-vcalm-issuer` and `receive-from-oid4-issuer`. The two live leaves
  add no protocol code: they wrap the existing `wallet-client/drivers/*-issuer-flow`
  drivers and project their observations into a client-safe `IssuerFlowSummary`,
  independent of `wallet-runner`), and `verifier-runner`
  (the OID4VP/VCALM verifier acceptance engine — acceptance-pass
  generator + scorer, request floors, and present-time delivery; see
  [`adr/2026-07-04-verifier-assessment-model.md`](adr/2026-07-04-verifier-assessment-model.md)).
  **All three verifier pages have now migrated to scenarios** — direct-delivery
  (`ob3-direct-verifier-acceptance`), VCALM
  (`vcalm-verifier-delivery` / `vcalm-verifier-acceptance`), and OID4VP
  (`oid4-verifier-delivery` / `oid4-verifier-acceptance`, M10b). **All three
  issuer pages have too** (M11) — direct-delivery
  (`ob3-direct-issuer-delivery`), VCALM (`vcalm-issuer-issuance`) and OID4VCI
  (`oid4-issuer-issuance`), plus nine additive scenarios. `verifier-runner`,
  `issuer-runner` and `wallet-runner` are now all **dead code** — the standing
  engines, their API routes, and the legacy page components are swept together in
  M13; only the three **wallet** pages still run on `wallet-runner` (M12)
  ([`adr/2026-08-19-migrating-a-server-scorer-onto-scenarios.md`](adr/2026-08-19-migrating-a-server-scorer-onto-scenarios.md)).

## Scenarios

A **scenario** is the suite's runnable unit: one small, subtle measurement made of
ordered steps, each with an optional action and its own fine-grained
requirements. It replaces the combination `(role, workflow, profile)` as the
thing you run. See
[`adr/2026-08-13-scenario-as-runnable-unit.md`](adr/2026-08-13-scenario-as-runnable-unit.md).

The model lives in `src/lib/interop/scenarios/` and is **client-safe** — nothing
in it imports from `src/lib/server/`:

| File                      | What it holds                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `scenario-schema.ts`      | `Scenario`, `ScenarioStep`, `ScenarioAction`, and the opaque `RecipeId` / `RequestId` / `IssuingIntent` ids |
| `requirement-schema.ts`   | `Requirement`, `RequirementLevel`, `RequirementCheck`, `AttestedAnswer`                                     |
| `membership.ts`           | `Membership`, `MembershipLevel`, `OneOfGroup`                                                               |
| `scenario-fingerprint.ts` | `scenarioFingerprint()` — drift detection                                                                   |
| `catalog-validation.ts`   | `validateCatalog()` / `assertValidCatalog()`                                                                |
| `accessors.ts`            | `scenarioBySlug`, `scenariosFor`, `membershipsOfProfile` (`scenarioHref` is in `checklist-href.ts`)         |
| `all-scenarios.ts`        | the registry, validated at module evaluation                                                                |

Four properties are load-bearing:

- **`workflow` is taxonomy only.** It groups the catalog and never constrains
  what a step's action may do.
- **`ScenarioAction` is a closed union** (`issue`, `request-presentation`,
  `deliver-direct`, `present-to-verifier`, `receive-from-issuer`). Extending it is the only escape
  hatch — a new kind is reviewed once and reusable forever, unlike a bespoke
  page. `issue` and `request-presentation` mint an exchange through the
  transaction service; `deliver-direct` mints none — the suite signs the recipe
  locally (`scenarioRunner.deliverDirect`, optional `tamper`) for the operator to
  download and hand over; `present-to-verifier` is the inverse of
  `request-presentation` — the suite is **holder**, presenting a signed recipe to
  the operator's own verifier over a live exchange the operator drives (they
  paste the interaction URL / authorization request at run time),
  `transport: 'vcalm' | 'oid4vp'` — both live (see
  [`adr/2026-08-20-present-to-verifier-action.md`](adr/2026-08-20-present-to-verifier-action.md));
  `receive-from-issuer` is the inverse of `issue` — the suite is the
  **recipient**, taking delivery of a credential the operator's own issuer
  produced, over `transport: 'direct' | 'vcalm' | 'oid4vci'` (a pasted
  credential, a VC-API interaction URL, an `openid-credential-offer://` URL, all
  supplied at run time). Its optional `keyProofSuite` is the cryptosuite the
  **suite's own** test wallet signs its holder key proof with; it is generated
  locally, is therefore always servable, and is **not** an `IssuingIntent` —
  nothing in an issuer scenario pins the deployment's crypto axis, because the
  suite mints nothing.
- **The level belongs to the membership, not the scenario.** A scenario carries
  `memberships[]`, each `required | optional | additive-only | { oneOf }`,
  exactly one naming a base profile. `additive-only` is what an additive
  scenario takes in its base profile: the base names it because that protocol is
  what the scenario runs over, and claims **none** of it, so add-on work never
  enters a base profile's Essential or Complete meter. So a profile is a _derived_ set of memberships
  (`membershipsOfProfile`), not a list stored on the profile.
- **Drift is derived, never declared.** There is no `version` field;
  `scenarioFingerprint()` hashes scoring-relevant content (requirement ids,
  levels, statements, answer kinds, `choose` options and right answers, step
  actions) and excludes cosmetic fields (`name`, `blurb`, `shuffleLabel`, step `id`/`title`/
  `summary`), so copy-editing never costs anyone their results.

### Catalog validation

`all-scenarios.ts` calls `assertValidCatalog()` at module evaluation and
**throws**, naming every violation at once — an invalid catalog is a build-time
authoring bug, not a runtime condition. `validateCatalog()` is the pure form
that returns the list. Eight rules:

1. Scenario slugs are unique.
2. Step ids are unique within a scenario.
3. Requirement ids are unique within a scenario.
4. Exactly one membership names a base profile.
5. **Every member of a `oneOf` group declares the same requirement ids.** The
   load-bearing one: a group is one obligation, so the completion denominator
   must not depend on which alternative the operator ran.
6. A `choose` answer's `correct` is one of its own option values.
7. Shuffled steps form a single contiguous run.
8. **A scenario with any shuffled step declares `shuffleLabel`.** A shuffled
   step's authored `title` is an answer key ("Offer an expired credential"), so
   the page never renders it — `shuffleLabel` is the neutral positional noun it
   renders instead. Without it, the page would have to fall back to the title,
   which is the leak the field exists to prevent.

### The run engine

`src/lib/interop/scenario-run/` turns a definition plus operator input into a
completed run. **Headless and pure** — no Svelte, no `localStorage`, no server
imports, and time and randomness are injected rather than read ambiently, so it
is deterministic under test. A page drives it; it drives nothing.

| File                     | What it holds                                                   |
| ------------------------ | --------------------------------------------------------------- |
| `evidence.ts`            | `StepEvidence` / `RunEvidence` and the accessors a check reads  |
| `automatic-checks.ts`    | the `AutomaticCheck` type and the id-keyed registry (`checks/`) |
| `run-state.ts`           | `ScenarioRunState`, the step lifecycle, `startRun`              |
| `shuffle.ts`             | seeded permutation of contiguous shuffled runs                  |
| `score-answer.ts`        | attested answer, and automatic check, → `RequirementOutcome`    |
| `requirement-outcome.ts` | the persisted outcome shape                                     |
| `roll-up.ts`             | outcomes → `passed \| failed \| incomplete`                     |

Four behaviours are load-bearing, and each has a test asserting it:

- **Automatic requirements resolve the moment a step settles, before any
  attested question is scored.** They are the wire truth, and showing "delivery
  completed ✓" while asking "so was it stored?" is the best teaching moment the
  suite has.
- **`cant-tell` fails.** "My wallet gave me nothing to judge by" is precisely the
  legibility failure under test; bucketing it as incomplete would park the
  commonest real failure mode in limbo and punish the honest answer. So
  `incomplete` means only "not answered yet".
- **A failing `SHOULD` is recorded and shown but does not block**; only a failing
  `MUST` fails the scenario. The unanswered check runs first — a run in progress
  is not yet a verdict.
- **A retry is simply `startRun` again**: fresh exchange, fresh fixture, fresh
  shuffle seed, every requirement answered anew. There is no answer editing and
  no answer-locking machinery, because re-answering after a reveal tests nothing.

`RunEvidence` is keyed by step id rather than holding only the current step's,
so a check **can** read a prior step. Nothing shipped crosses steps yet;
round-trip will, and the shape admits it without a rewrite.

**`StepEvidence` has one slot per fact, never two.** `artifact` is what actually
moved — the credential issued, the presentation received, the credential the
operator's issuer delivered — and `transport` is whether it moved at all. The
live-transport summaries beside them carry only **wire facts**, each a
client-safe union discriminated on `transport` with one accessor:
`VerifierRequestSummary` (`verifierRequestForStep`) for what the operator's
verifier asked for, and `IssuerFlowSummary` (`issuerFlowForStep`) for what their
issuer's exchange did. That split is what makes the issuer payload checks
transport-independent: the `credential-*` and `osa-*` families read `artifact`
and never the summary, so one family of checks serves a paste, a VC-API exchange
and an OID4VCI offer alike — which is why 58 engine rows collapsed to 33 checks
in M11. A summary is **plain data**: it is serialised to the browser, so no
access token, key or server object may enter one.

**`trace` is the one slot that is shown but never scored.** A `WireTrace` is the
ordered list of requests a step's transport actually made — stage, method, URL,
status, error, and the response body — projected by the receive/present leaves
from observations the drivers already keep (OID4VCI's is already
token-redacted). Three rules make it safe, and each has a test:

- **No `automatic` check may read it.** Every check reads the summaries above,
  which the leaf computes server-side from the **full** response before the
  projection runs. `trace-is-not-scored.test.ts` resolves every registered check
  over the same evidence with and without a loud trace and requires identical
  verdicts.
- **Bodies are capped for display** at 8 KB per stage (`server/domain/wire-trace/`),
  and a truncated stage says so with its original size. Because nothing scores
  off it, truncating costs detail and never a measurement.
- **It is never persisted.** `ScenarioRunRecord` holds outcomes only, exactly as
  the checklist era's `raw` did — a stored run is a list of outcomes, not a
  packet capture.

A step with no wire (`direct`, a pure question step) has no trace at all; its
summary and its `artifact` are the evidence.

A check that cannot be resolved (the catalog names an unregistered `checkId`)
**fails** rather than throwing — authored data should surface an authoring error,
not collapse a live run. A step that errored outright leaves its automatic
requirements **unresolved rather than failed**: we did not observe them, and
recording a failure we did not measure is the dishonesty the whole design avoids.

### The scenario page

`/scenarios/[slug]` is the **one generic route** — `ScenarioPage.svelte` renders
any catalog scenario, and **there are no bespoke scenario pages, ever**. The
route (`src/routes/scenarios/[slug]/`) resolves the scenario, parses attach
params and 404s an unknown slug in `+page.ts`; a `+page.server.ts` resolves
blocked-ness up front so a scenario this deployment cannot serve renders disabled
before the operator tries. `ScenarioPage.svelte` is a template over
`createScenarioRunController` (`scenario-run-controller.svelte.ts`), which owns
the run's `$state` and drives the engine — the component decides nothing about
scoring. URL reading stays at the route boundary; the page component takes props,
so Storybook drives the same component.

- **Step-as-spine.** Each step is a collapsing card
  (`components/interop/scenario-step/`) with its action rendered inside it —
  superseding the two-column `RunnableChecklist` layout for scenarios. A live
  step is expanded; a settled step collapses to a one-line summary and stays
  reopenable, which keeps a multi-step run short on a phone.
- **The reveal rule.** A step's setup is always visible and its requirement
  statements are always visible; only the **expected answer is concealed**, per
  requirement, until that requirement is answered — then revealed in the
  verdict-strip treatment. Automatic requirements resolve when the step settles,
  **before** its attested questions are answerable, so the operator sees what the
  wire said before being asked what they saw.
- **Details are step-level.** A live or settled step carries a collapsed
  `StepDetails` panel showing that step's evidence: the wire trace, the summary
  the requirements were checked against, and the received credential. It is
  step-level rather than per-requirement (as the checklist pages were) because
  checks are pure functions over one step's evidence and there are 40+ of them —
  a check → slice registry would have to be maintained against every one — and
  because the issuer scenarios are single-step, so `oid4-issuer-issuance` would
  otherwise render fifteen identical panels. The panel is on the **live** step
  too, which is the case it exists for: a delivery miss leaves the step in
  flight, and that is when an operator needs to see the 500. Miss evidence is
  held beside the run rather than settled, because settling is what resolves
  requirements and a miss resolves nothing. A stored run shows no panel.
- **`can't tell` is always offered** on every attested requirement, is appended
  by the component (never authored, never omittable), fails, and renders in the
  warning family — amber, so it is visibly a failure yet distinguishable from a
  wrong answer.
- **A run records only when every requirement is answered.** Finish is disabled
  with a count until then, never hidden. A step that errors therefore makes a run
  **unrecordable** — its automatic requirements stay unresolved — and the page
  offers only "Start over". Navigating away records nothing.
- **Attach mode** adopts an externally-minted exchange into step 1, and **only
  for a single-action-step scenario**: in a shuffled scenario step 1 is random,
  so adopting into it is both meaningless and a leak of which pass the operator
  is on.
- **`shuffleLabel` + position** is the only label a shuffled step ever shows; its
  authored title is an answer key. The label is resolved by the controller, never
  by the step card, so the leak cannot be reintroduced by a component reading the
  whole step.

### The proof-of-concept catalog

Two scenarios prove the architecture on `credential-acceptance × oid4`, and they
are the worked example of authoring one as data — no code, no bespoke page:

- **`oid4-wallet-acceptance`** — the migrated happy path. One `issue` step
  (`minimal-ob3`, elective), two automatic MUSTs (the exchange completed, the
  holder proved a DID), one attested MUST the wire cannot see (the credential
  landed in the list), and a SHOULD characterising what the wallet drew.
  `/wallet/credential-acceptance/oid4` is a query-preserving `308` redirect to
  it, so attach links keep working; the vcalm sibling keeps its old page until
  M12.
- **`oid4-wallet-refusal-discrimination`** — three `shuffle: true` passes (valid
  control, `ob3-expired`, `minimal-ob3` + `tamper: 'proof'`) that permute
  together. Every pass carries an **identical** requirement shape — a weak
  automatic check (the offer was fetched), an attested MUST ("what did your
  wallet do?"), and an attested legibility SHOULD — so the passes are
  indistinguishable before answering; only the concealed right answer differs
  (accept the control, refuse the other two). This is **one measurement, not
  three**: one scenario, one result.

The tampered pass depends on a transaction service that honours `tamper`; a build
that silently drops it delivers a valid credential and the discrimination
measures nothing. See [`docker/README.md`](../docker/README.md).

### The completion group

A **completion group** is how a `(profile, role)` **bundle** is read: a heading
with a meter and its scenario rows, with **workflow as a sub-heading inside** the
group — never the top-level grouping, so "how close am I to the OID4 Wallet
badge?" is answerable at a glance rather than spread across three headings. It
renders in two places: the homepage (replacing the flat workflow list) and each
profile detail page (one group per role, scoped to that profile).

A base profile-role reads as up to **three kinds of category**, in this order:

1. **Essential interoperability** — the profile's `required` + `oneOf` scenarios →
   the base badge, e.g. _OID4 Wallet_.
2. **Expanded interoperability** — the _same_ profile's `optional` scenarios.
   Together with Essential these form the **Complete** tier → the _"— Complete"_
   badge. Complete is **cumulative**: its meter counts Essential ∪ Expanded, so it
   spans two body sections. That is why **every category heading carries its own
   count** — `8/13 + 0/4 = 8/17` has to be a sum the reader can do from the rows on
   screen, or a cumulative meter is unauditable.
3. **Add-ons** — one section per selected additive profile that reaches this
   `(profile, role)`, counted toward **neither** base tier. An additive layers work
   many implementers will never want; a denominator they cannot opt out of would
   put Complete beyond their reach. The section shows a **slice** —
   `evaluateAdditiveSlice`, this base profile's share of an additive whose badge
   spans several — so it carries **no claim control**; claiming happens on the
   additive's own page.

Tier colour is cued on the dot, label and rule (Essential = primary, Complete and
Expanded = accent, add-on = `live`), never on the bar: meter **fill** stays
semantic everywhere (green full, warm partial). A group with no expanded set and no
selected add-on renders as one meter and one flat list, exactly as before.

The level that makes category 3 possible is **`additive-only`**: a base membership
that names the delivery protocol a scenario runs over while placing it in neither
of that profile's tiers. See
[the badge award model ADR](./adr/2026-08-18-badge-award-model.md) § Amendment
2026-08-21.

Every number the group shows comes from M4's `evaluateCompletion` in
`src/lib/interop/completion/` — the widget **computes nothing**:

- **The unit is the requirement, not the scenario.** A row reads
  `4/5 requirements met`, so the meter visibly adds up from its own rows; a
  scenario with a failing SHOULD is not flattened to a bare ✗.
- **A `oneOf` group renders as one obligation** — "any one of" siblings that
  each stay runnable but stop gating once one passes.
- **`optional` memberships render in the Expanded section**, never folded into the
  Essential meter — including them would mean Essential could never fill. They
  _are_ counted by the cumulative Complete meter above them.
- **`additive-only` memberships are not the base profile's work at all** and
  appear in neither Essential nor Expanded — only in the add-on's own section.
- **A blocked scenario renders disabled with its `CannotServe` reason and still
  counts in the denominator** — the badge is blocked, not made easier.
- **Each tier's meter fills exactly when _its_ badge is claimable.** Essential
  comes from `isClaimable(result)` (the `required` meter), Complete from
  `isExpandedClaimable(result)` over `completeTotals(result)` — both sets full, and
  never claimable with an empty Expanded set; a tier's meter fill and
  its `[Claim …]` control both read that one predicate, so a header cannot lie.
  Each control links to its own `/badges/[slug]` (base via `badgeFor`, Complete via
  `completeBadgeFor`) or stays disabled where no badge is registered. Once claimed,
  each tier shows its own _"Claimed 3 Aug against N requirements · k new since"_
  line (see **§ Badges**).

Run records are browser-only (`localStorage`), so both surfaces hydrate them in
`onMount` and render a zeroed meter during SSR. The homepage additionally carries
a **"Not yet migrated"** section — the `(role, workflow, profile)` combinations
that have no scenario yet, rendered with the now-statusless `ChecklistRow`. It
counts toward no meter, shrinks as M10–M12 migrate pages, and is deleted in M13.
There is deliberately **no separate `/scenarios` index**: the homepage is the
catalog.

## Provider dependency injection

The provider system in `src/lib/server/util/provider/` is a lightweight
DI mechanism built on AsyncLocalStorage. It lets us share services
across startup, request handling, tests, and stories without manual
threading.

Key concepts:

- **Provider**: a function that returns a slice of context. Convention:
  `provideThing()` for no-config, `ThingProvider(opts)` PascalCase
  factory when configuration is needed.
- **Provider chain**: `Providers(a, b, c)` composes slices into one
  context object. Each provider receives the accumulated context, so
  later providers can depend on earlier ones.
- **Context types**: `XxxCtx = OutputOfProvider<typeof provideXxx>`.
- **Access**: `providerCtx<Ctx>()` reads the current context;
  `providerCtxSafe<Ctx>()` returns `Partial<Ctx>` (no throw).

A walkthrough with runnable examples lives in
[`src/lib/server/util/provider/README.test.ts`](../src/lib/server/util/provider/README.test.ts).

### Service slice pattern

Each service has a Real and a Fake variant, both factory functions
returning the same interface:

```
src/lib/server/services/time-service/
  time-service.ts            # interface + RealTimeService + FakeTimeService
  time-service.test.ts       # exercises both
  provide-time-service.ts    # provideTimeService + FakeTimeServiceProvider + accessor
```

The dev context wires `RealTimeService`; the test context wires
`FakeTimeService` with a fixed instant. Tests that need to advance time
can recover the fake surface via `asFakeTimeService()`.

### Adding a new service

1. Pick a folder: `src/lib/server/services/<name>/`.
2. Write `<name>-service.ts` with interface + `Real…` + `Fake…` factories.
3. Co-locate `<name>-service.test.ts` exercising both variants.
4. Add `provide-<name>-service.ts` with the no-config provider, the
   `XxxCtx` type, and a thin accessor function.
5. Register the service in `AppContext` and in both
   `dev-app-context.ts` and `test-app-context.ts`.
6. Use it via the accessor inside `runInContext` scopes.

### Adding a new domain feature

Domain code lives under `src/lib/server/domain/<feature>/` (see the
list in [High level](#high-level)). Within a feature folder, organize
by what files _do_ (`ops.ts`, `queries.ts`, `schemas.ts`) rather than
by type.

## Request lifecycle

`src/hooks.server.ts` handles each request:

1. Read the per-process AppContext (built once at module evaluation via
   `buildAppContext`).
2. Mint a request ID with `idService.short('req')` and stash it on
   `event.locals.requestId`.
3. Run the SvelteKit handler inside `runInContext(ctx, …)` so server
   code in any route or +server endpoint can read services.

The two endpoints already wired (`/health`, `/version`) demonstrate
this: `/health` calls `appContext()` (which throws helpfully if the
context is missing) and returns `{ status: 'ok', version }`; `/version`
returns the package + git info from `appVersion()`. A third endpoint,
`GET /health/ready`, runs the health registry's config-readiness check
(503 when overall is `DOWN`); the server also emits a periodic
`health-snapshot` structured log for Loki/Grafana (see
`src/lib/server/health/`).

## Exchange runner — minting, and attach mode

The four runnable wallet routes
(`/wallet/credential-{acceptance,presentation}/{vcalm,oid4}`) drive a real
exchange against the DCC transaction service. There are two ways in, and the
page's read path is identical afterwards.

**Mint** (the default). The page `POST`s **a scenario action** to
`/api/exchange-runner/create`, takes the one protocol link its profile speaks
(`iu`, `OID4VCI`, or `OID4VP`), renders the QR, and polls
`GET /api/exchange-runner/[exchangeId]?stepCount&workflow` every 2s until the
exchange settles.

The body is `{ kind: 'issue', credential, tamper?, intent?, exchangeIdPrefix? }`
or `{ kind: 'request-presentation', request }`. (`deliver-direct` and
`present-to-verifier` mint no suite exchange and never reach here — the first
signs a file locally, the second joins an exchange the operator's verifier
hosts, each via its own `scenario-runner` route.) There is no default action: an
unrecognised body is a 400, as is an id no registry knows or an intent this
deployment cannot serve.

### What a scenario may vary, and where it comes from

`src/lib/server/domain/scenario-runner/` holds the id-keyed registries the
catalog reaches into. Scenarios stay client-safe data; the documents and
tenancy live here.

- **`credential-recipes.ts`** (+ `recipes/`) — `RecipeId` → an unsigned OB3
  document. The claim workflow's template is `{{{vc}}}`, a Handlebars
  **triple-stache**, so the document a recipe builds _is_ the credential. The
  services overwrite only `credentialSubject.id`, `credentialStatus`,
  `issuer.id` and `proof`; everything else — dates, achievement content,
  `image`, `alignment`, arbitrary extra fields — is the recipe's. Expiry and
  not-yet-valid therefore cost nothing. A recipe **must not hardcode the
  credential `id`**: the status service's allocate is idempotency-guarded per
  credential id, so the route mints a fresh one per exchange.
- **`presentation-requests.ts`** (+ `requests/`) — `RequestId` → the
  `vprCredentialType` / `vprContext` / `vprClaims` / `trustedIssuers` a verify
  exchange is minted with.
- **`resolve-issuing-context.ts`** — the seam between a scenario's
  `IssuingIntent` and what the deployment can actually serve. **Absent intent
  means elective** (the transaction service already ranks issuer instances by
  the wallet's advertised suites); present means pinned. An unservable pin
  returns a typed `CannotServe`, which the route surfaces as a 400 and the UI
  renders as a disabled scenario — **still counted in the completion
  denominator**, so the badge is blocked rather than quietly made easier.

Two variables are worth calling out on the wire. **`tamper`** (`'proof'` or
`'claim'`) corrupts the credential _after_ signing and before delivery, which is
the only way to get a proof and payload that genuinely disagree.
**`exchangeIdPrefix`** is a **sibling of `variables`, not a member of it** — it
rides into the minted `exchangeId` and so appears in the exchange journal, which
outlives the exchange itself (`EXCHANGE_TTL`).

Cryptosuite and DID method are **deployment configuration**, not request
variables: they ride the tenant (`TENANT_CRYPTOSUITE_<T>` on the signing
service, and `did:web` when `TENANT_DID_URL_<T>` is set). This suite holds one
tenant, so `resolveIssuingContext` answers from
`TRANSACTION_SERVICE_TENANT_CRYPTOSUITE` / `_DID_METHOD`. When a
`(cryptosuite, didMethod) → tenant` map or a transaction-service API takes over,
**only that function changes — no scenario is touched.**

**Attach** (`?exchangeId=…&workflow=claim|verify`). The exchange was minted
_outside_ the suite — by an interop-probe CLI, or another harness — and the page
adopts it by id:

- `+page.ts` parses the query (`client/exchange-runner/attach-params.ts`) and
  passes `attachExchangeId` / `attachWorkflow` in as props. **URL reading stays
  at the route boundary**: the page components are also driven by Storybook
  stories, so they stay parameterised rather than location-aware.
- On mount, `attachExchange()` (`client/exchange-runner/attach-exchange.ts`)
  `GET`s `/api/exchange-runner/[exchangeId]/protocols?workflow=…`, which returns
  the same `{ exchangeId, protocols, workflowId }` body `create` does. The page
  then sets `interactionUrl`, goes to `awaiting-wallet` and polls exactly as a
  minted run does.
- **Attach offers no path to minting.** No `onInitiate`, no `onRetry` (it would
  mint) and no `onReset` (its only exit is minting) reach
  `ExchangeRunnerPanel`; with no `onInitiate` the panel replaces its idle CTA
  with an explanation instead of rendering a control that cannot work.
- Attach renders **observations, not verdicts** — the per-step display and the
  run record are unchanged, and `deriveRunStateFromExchange` maps steps
  positionally, so a probe whose step shape differs from the checklist's will
  show approximate per-step states.

The adopt endpoint is a separate route from the poll endpoint on purpose: the
poller ticks every 2s and does not need protocols, which never change. It
mirrors the poll route's disabled-hint, workflow parsing and error mapping, so
the runner API keeps one error vocabulary.

`getProtocols` sits on the `TransactionServiceClient` interface beside
`createIssuanceExchange` / `createVerificationExchange` / `getExchange`, and is
implemented by both the real HTTP client and the in-memory fake. Note the wire
asymmetry it absorbs: the transaction service's `POST …/exchanges` returns the
protocols object bare, while `GET …/protocols` wraps it in `{ protocols }`.
Callers see the one shape.

> **During a probe sitting, point `TRANSACTION_SERVICE_URL` at the host dev
> transaction service, not the pinned compose image** — see
> [`docker/README.md`](../docker/README.md#attach-mode-and-probe-sittings).

## Theme system

Lives in `src/routes/layout.css`:

- `:root` declares the **Tokyo Night light** token set as CSS custom
  properties (`--background`, `--foreground`, `--primary`, `--accent`,
  …).
- `.dark` redeclares the same names with the **Tokyo Night dark**
  values. The `@custom-variant dark` rule wires Tailwind's `dark:`
  utility to the `.dark` ancestor.
- `@theme inline` exposes each token as a Tailwind utility token
  (`bg-background`, `text-foreground`, …) and binds the JetBrains Mono
  - Inter font stacks to `--font-mono` / `--font-sans`.
- Custom display utilities (`text-display-lg`, `text-headline-md`,
  `text-label-md`) default to `font-mono` so headers carry the
  dev-tool feel.

Flash prevention: an inline script in `app.html` reads
`localStorage.theme` and toggles `.dark` on `<html>` before paint. The
`+layout.svelte` `onMount` and the `ThemeToggle` keep the class in sync
on subsequent navigations and OS-preference changes.

## Client-side persistence

The app keeps two pieces of state in `localStorage`, isolated under
`src/lib/client/`:

- **Selection** (`client/selection/selection-store.svelte.ts`) — the user's
  chosen roles/profiles, key `lits.selection.v1`. A Svelte 5 runes store;
  hydrate from a browser `onMount` only (never during SSR). Unknown slugs are
  validated away on read via `RoleSlug`/`ProfileSlug` schemas.
- **Scenario runs** (`client/scenario-runs/scenario-run-store.ts`) — one
  `ScenarioRunRecord` per scenario, key `lits.scenario-runs.v1`. The pure model
  lives in `interop/scenario-run/`; only the store touches `localStorage`. It
  `safeParse`s every entry and drops malformed ones — never throws to the UI.
- **Badge claims** (`client/badges/badge-claim-store.ts`) — an array of
  `BadgeClaimSnapshot`, key `lits.badges.v1`. The pure model lives in
  `interop/badges/`. Its drift rule is the **inverse** of the run store's: a
  snapshot **never drops**. A run record is a claim about the _current_
  definition and reverts to "not run" on drift; a claim snapshot is a
  _historical fact_ — the badge was claimed — and must survive the catalog moving
  on, or _"k new since"_ could not be said. Writes are idempotent on
  `(badgeSlug, claimedAt)`. Both stores feed M9's `{ results, badges }` export
  bundle verbatim — `results` from the run store, `badges` from this one.

The record is a flat map keyed by scenario slug, **not** an array per bucket:

```
{ scenarioSlug, ranAt, fingerprint, status, outcomes, attempts }
```

**One result per scenario — the latest — plus an `attempts` counter.** Nothing
in the UI wants more. Holding history costs one schema bump (the value type
becomes an array; the record travels unchanged), which is priced as affordable
and deliberately not pre-built. `recordScenarioRun` owns the increment, so no
call site can get the count wrong.

Each entry of `outcomes` carries the raw answer, the **expected** answer, the
derived status and the `automated | attested` source. Denormalising the expected
answer is what lets a stored run render its reveal without the live definition.

**Drift drops the record.** On read, each record's `fingerprint` is compared
against the live scenario's; a mismatch — or a slug the catalog no longer holds
— means the record is silently discarded and the row reverts to "not run". There
is no `outdated` state to render. This is also what lets an export bundle carry
no scenario definitions: records from a catalog that has moved on just drop.

`lits.run-history.v2` and `.v1` are **removed on first write and never read**.
There is no migration: those runs were keyed by a combination that is no longer
runnable, their `statuses` used a deleted requirement vocabulary, and their
`checklistFingerprint` hashed a `profile.checklists` that is on its way out. See
[`docs/adr/2026-08-13-scenario-run-record-and-completion.md`](adr/2026-08-13-scenario-run-record-and-completion.md)
(supersedes [`2026-07-11-run-history-v2-flat-record.md`](adr/2026-07-11-run-history-v2-flat-record.md)).

### The export / import bundle

Durability without a server: results survive a cleared browser, move between
machines, and — later — become the seam an agent drives this suite through.

The bundle is **the two stores verbatim in a thin envelope**, downloaded as
pretty-printed JSON:

```
{ format: 'lits.scenario-results', version: 1, exportedAt,
  results: { [scenarioSlug]: ScenarioRunRecord },   // the run store's map
  badges: [ BadgeClaimSnapshot ] }                   // the badge store's array
```

`results` is exactly the run store's map and `badges` exactly the badge store's
array — **no transformation either way**. Keeping it byte-identical is what
keeps the deferred agent surface open; a bundle that reshaped a store would have
to be re-derived every time that store changed. No scenario definitions ride
along — the `fingerprint` in each record is the link back to the live catalog.

`ResultBundle`, `buildBundle`, `applyBundle`, and `parseBundle` are **pure** and
live in `interop/scenario-run/bundle.ts`. The one browser-API part —
`Blob`/`URL` download and file read — is `client/scenario-runs/bundle-io.ts`,
which reads and writes the two stores through their own APIs (it never touches
`localStorage` directly).

**Import is per-scenario replacement, incoming copy wins.** Scenarios absent from
the bundle are untouched; predictability beats cleverness and it needs no
conflict UI. Incoming records pass through the **same drift rule a read applies**
(`liveRunRecords`, shared with the run store — one code path, not two), so a
drifted, unknown-slug, or malformed record simply drops. **Badges merge
additively** and deduplicate on `(badgeSlug, claimedAt)`: a claim is a historical
fact, so importing never erases one the local store already holds. A wrong
`format` or `version` is reported as a clear error rather than silently doing
nothing.

### Completion and the meter

`src/lib/interop/completion/` turns stored runs into the numbers the meter
renders, for one `(profile, role)` set. Pure — it takes the runs and returns
arithmetic.

**The governing rule: the meter fills exactly when the badge becomes claimable.**
They share a header, so `isClaimable()` is the single predicate both use; the
meter never re-derives `met === total` on its own.

Five rules, each with a test:

1. **The unit is the requirement, not the scenario** — a row reads
   `4/5 requirements met`, so the meter visibly adds up from its own rows, and a
   scenario with four passes and one failing SHOULD is not flattened to a ✗.
2. **A `oneOf` group is one obligation.** Members declare identical requirement
   ids (catalog rule 5), so the group contributes that set once and stops gating
   as soon as one member passes.
3. **`optional` memberships are excluded from the base meter** and get their own
   sub-meter. Including them would mean the base could never fill.
4. **A blocked obligation does not shrink the denominator.** When
   `resolveIssuingContext` reports the deployment cannot serve a pinned pair,
   those requirements stay in `total` and contribute nothing to `met` — the
   badge is blocked, because a shrinking denominator would let two deployments
   issue badges that look identical and mean different things.
5. **Only a `pass` outcome is met.** A failing SHOULD is therefore unmet here
   while still not failing its scenario; both numbers come from the same
   outcome map and answer different questions.

## Badges

A **badge** turns one tier of a `(profile, role)` bundle into a claimable Open
Badges 3.0 recognition credential. The full rationale is
[`docs/adr/2026-08-18-badge-award-model.md`](adr/2026-08-18-badge-award-model.md)
(with the M14 tier-keying amendment); the shape of it:

- **The domain is pure and client-safe** (`interop/badges/`): a `BadgeDefinition`
  whose `tier` decides _which sub-set_ of a `(profile, role)` it scores — `base`
  the `required` + `oneOf` floor, `complete` the same base profile's `optional`
  set, `additive` an additive profile's whole (single-tier) set. `scenariosBehindBadge`
  is the one seam that applies this filter; the fingerprint, the `BadgeClaimSnapshot`,
  the `newSince` diff, and the criteria page all read through it, so a base badge and
  a complete badge for one `(profile, role)` are two different sets. `badgeKey` keys
  base/complete to the base profile and additive to the additive profile — the base
  badge never changes meaning when the Complete set grows. Both tiers of the
  `oid4/wallet` bundle are registered (`oid4-wallet`, `oid4-wallet-complete`);
  additive badges stay unregistered (dormant) until additive scenarios exist.
- **The credential is a plain OB3** built server-side in
  `server/domain/badges/badge-recipe.ts` — a module apart from the test recipes,
  importing nothing from `scenario-runner/recipes/` and imported by nothing
  there. It mirrors `minimal-ob3`'s OB3-required fields (a top-level `description`
  and `Achievement.description`) — a badge missing them is refused by conformant
  OID4 wallets. No `evidence`, validity window, status list, revocation, or image.
  The `issuer` is an _object_ carrying a `did:key:placeholder` id the signing
  service **overwrites** from the tenant seed (it replaces the value rather than
  injecting one, so the placeholder must exist); the recipe never names the real
  issuer, so the app stays issuer-agnostic.
- **The version rides on `criteria.id`, not `achievement.id`.**
  `achievement.id = <BADGE_ROOT_URL>/badges/<slug>` is stable;
  `criteria.id = …?v=<fingerprint>`. The fingerprint composes the per-scenario
  `scenarioFingerprint`s through the same djb2 hash — the badge `?v=` and the
  scenario drift check are one mechanism. A stale `?v=` link renders the current
  criteria under a plain "older version" note; no historical definitions are
  stored.
- **Claiming reuses the M2 mint seam but is not a scenario.** A dedicated
  `POST /api/badges/[slug]/claim` builds the per-award doc and calls
  `resolveIssuingContext` + `createIssuanceExchange`; the create route and the
  test-recipe registry are untouched. The client driver (`pages/badge/`) drives
  it with `pollExchange(..., { stepCount: 1, workflow: 'claim' })`, records **no**
  `ScenarioRunRecord`, and on delivery persists a snapshot. A failed claim is a
  retry, not a test finding — the receiving wallet is not the system under test.
- **`/badges/[slug]` serves three jobs from one route.** Jobs 1–2 — the
  stranger's criteria page and the `?v=` mismatch warning — are server-rendered
  from the definition alone (SSR-correct, no `localStorage`). Job 3 — the claim
  affordance and the claimed state — is a client overlay gated on the single
  `isClaimable()` predicate; a stranger never sees it.
- **A claimed badge never un-earns.** The `lits.badges.v1` snapshot (see
  **§ Client-side persistence**) drives _"Claimed 3 Aug against N requirements ·
  k new since"_ on both the badge page and the completion group. "k new since" is
  a **membership** diff — requirements added to the set since the claim — not a
  fingerprint compare, so a requirement that changed shape but kept its id is not
  counted.

**`did:web` is deployment configuration.** M8 validates on the dev `did:key`
tenant; the root-domain `did:web` issuer is a tracked ops task (set
`TENANT_DID_URL_<TENANT>` on the signing service), and `BADGE_ROOT_URL` names the
public origin the badge ids resolve to. This repo serves no DID document. Until
`did:web` is hosted, badges issue from the tenant's `did:key`, which is correct
for dev. See `.env.example`.

This is also why the **authoring convention** matters: a newly-registered
scenario should join a profile as `optional` and be promoted to `required` only
at a deliberate catalog moment (documented in `interop/scenarios/all-scenarios.ts`).
A routine addition silently raising a badge's bar would make an earlier claim
read as incomplete; the convention keeps a claimed badge honest as the catalog
grows.

## Test harness

`vite.config.ts` declares three Vitest projects:

| Project     | Includes                                    | Where                         |
| ----------- | ------------------------------------------- | ----------------------------- |
| `client`    | `src/**/*.svelte.{test,spec}.{js,ts}`       | Browser (Playwright Chromium) |
| `server`    | `src/**/*.{test,spec}.{js,ts}` (non-svelte) | Node                          |
| `storybook` | every `*.stories.svelte` via `addon-vitest` | Browser (Playwright Chromium) |

`pnpm turbo test` runs all three. The redundant `test:storybook` script
is kept for manual debugging only — running it in parallel with
`test:vitest` makes them fight over Playwright.

Playwright e2e specs live under `e2e/`. `pnpm turbo e2e` depends on
`build` and uses `pnpm preview` as the web server. CI runs `check` and
`test`; e2e runs locally only for now.

## Pointers into the style guide

- [Philosophy](style/philosophy.md) — composition, pure functions,
  immutability.
- [Factory functions](style/factory-functions.md) — why we don't use
  classes.
- [Providers](style/providers.md) — DI conventions.
- [Schemas](style/schemas.md) — `ZodFactory` patterns.
- [Naming](style/naming.md), [File organization](style/file-organization.md),
  [Documentation](style/documentation.md).
