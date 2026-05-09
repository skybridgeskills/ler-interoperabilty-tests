# 2026-05-09 — Interop Navigation: Notes

## Scope of work

Flesh out the navigation and information architecture (IA) of the LER
Interoperability Test Suite so that developers building issuers, wallets, and
verifiers can drill from a high-level overview into the exact ordered checklist
of steps they need to implement for a particular interoperability profile.

The site teaches and tracks the technical work each product type must do to
participate in interoperable credential workflows defined in the Strada
Ecosystem Coordination Guide (the "Interoperability Guide for Learning
Mobility"). It surfaces:

1. **Three product types (roles):** Issuer, Wallet (holder), Verifier.
2. **Six workflows** organized into three pairs:
   - **Issue to Wallet** — Credential Issuance (Issuer), Credential Acceptance
     (Wallet).
   - **Verify from Wallet** — Credential Request and Verification (Verifier),
     Credential Presentation (Wallet).
   - **Standalone Operations** — Direct Credential Issuance (Issuer), Direct
     Credential Verification (Verifier).
3. **Three interoperability profiles** with workflow support:
   - **VCALM-EdDSA** (`vcalm-eddsa-v1`) — supports the 4 protocol-based
     workflows.
   - **OID4-ECDSA** (`oid4-ecdsa-v1`) — supports the 4 protocol-based workflows.
   - **OB 3.0 Direct Delivery** (`ob3-direct-delivery-v1`) — supports the 2
     standalone (direct) workflows.

### Page types in scope

- **Home page (`/`)** — overview of all workflows; quick links into each role
  and each profile.
- **Role landing pages** (`/issuer`, `/wallet`, `/verifier`) — more detail on
  the workflows that role participates in, with profile options for each.
- **Workflow × profile checklist pages** — a SvelteKit dynamic route that
  shows an ordered, numbered checklist of steps for that role + workflow +
  profile combination, mirroring the "Step-by-Step Process Flow" from the
  source guide. Total: 10 valid combinations (see counts above).
- **Profile detail pages** — list the workflows (and each workflow's role)
  included in the profile, with a short description of the profile's key
  components and the cryptographic / protocol choices.

### Out of scope (this plan only)

- Actual conformance test execution, fixtures, or wallet-style interactive
  tooling (those land in later feature plans).
- Server-side persistence of checklist progress (later — possibly localStorage
  in a follow-up).
- Trust registry, status list verification UIs, or any real verifier engine.
- Editing / authoring UI for profiles or workflows.
- API endpoints to serve the data — pages render directly from a
  TypeScript/zod content module.

## Current state of the codebase

### What already exists (post-scaffold)

- SvelteKit app shell + Tokyo Night theme + provider DI skeleton
  (see `docs/plans-done/2026-05-09-sveltekit-scaffold/`).
- `AppHeader` (`src/lib/components/app-header/AppHeader.svelte`) with
  brand mark + nav links to `/wallet`, `/verifier`, `/issuer` + theme toggle.
- Landing page (`src/lib/pages/LandingPage.svelte`) with three role cards
  linking to placeholder pages.
- Role pages (`src/routes/{wallet,verifier,issuer}/+page.svelte`) currently
  render the `ComingSoon` shell.
- shadcn-svelte primitives (`Button`, `Card`, `Badge`, `Input`, `Tabs`,
  `Dialog`) under `src/lib/components/ui/`.
- No domain folders yet (`src/lib/server/domain/` doesn't exist).
- No content / data modules yet.

### What does not exist

- A typed model (TS + zod) of profiles, workflows, roles, and checklist steps.
- Any non-placeholder content for role landings or workflow checklists.
- A profile index / detail route.
- Any dynamic route (`[role]`-style) — current routes are all static.

## Source content

The source-of-truth content for the data model is in the Strada Ecosystem
Coordination Guide working directory:

- `index.md` — overall workflow + profile narrative and step-by-step process
  flows.
- `profiles/ob-3.0-direct-delivery.md`, `profiles/oid4-ecdsa.md`,
  `profiles/vcalm-eddsa.md` — per-profile checklists by role + workflow.
- `profiles/*.yaml` — structured machine-readable equivalents of the markdown
  profile docs (could be useful as a copy source for the content module, but
  this repo will own its own typed copy).

We will hand-curate a typed content module in this repo so it stays
self-contained, doesn't depend on a sibling working directory, and validates
at build/test time via zod schemas.

## Style conventions (for this plan)

The plan touches UI, route structure, and a typed content module, so all
relevant conventions from `docs/style/` apply. Highlights to copy into
`00-design.md` and each phase file:

- **Factory functions, not classes** — `function ChecklistRenderer(...) { ... }`,
  not `class ChecklistRenderer`.
- **`ZodFactory` for shared schemas** — model `Profile`, `Workflow`, `Role`,
  `WorkflowChecklist`, `ChecklistStep` as `ZodFactory(...)` exports;
  always export the `ReturnType<typeof Foo>` type alias.
- **Domain-first layout** — the typed content + helpers live under
  `src/lib/interop/` (no server-only behavior here, so it's `lib/`, not
  `lib/server/domain/`). Routes colocate under `src/routes/`.
- **File size ≤ ~200 lines** — split content into multiple files per profile
  (and per role/workflow if a single profile file gets large).
- **Order by abstraction** — exported types/schemas first, content data and
  helpers below, private helpers last.
- **Naming** — files `kebab-case.ts`; Svelte components `PascalCase.svelte`
  matching the component name (e.g. `WorkflowChecklist.svelte`,
  `ProfileSummary.svelte`); accessor verbs (`profileById`, `workflowsForRole`).
- **Re-exports** — every domain folder ships an `index.ts` that exports the
  public API; private helpers stay unexported.
- **Stories** — every reusable UI component gets a `*.stories.svelte` file
  exercising its variants and key states.
- **Tests** — co-locate as `*.test.ts` next to the file under test; use the
  three Vitest projects appropriately (browser for `*.svelte.test.ts`,
  node for plain `*.test.ts`).

## Questions

These are the open decisions to resolve before we write `00-design.md`.
Each is presented one at a time during the question-iteration step.

### Q1. Route shape for the workflow × profile checklist pages

**Context:** The user said "navigate through product type and then to workflow
and workflow for an interoperability profile." That implies role-first nesting.
The site also needs a profile index + profile detail page, and the home page
should overview all workflows.

**Options:**

- (a) Role-first: `/[role]/[workflow]/[profile]`
  - e.g. `/issuer/credential-issuance/vcalm-eddsa`
  - matches the user's stated nav order; flat and predictable.
- (b) Role-first with `workflows/` segment: `/[role]/workflows/[workflow]/[profile]`
  - same drill path; a bit more verbose; gives a natural place for an index.
- (c) Profile-first: `/profiles/[profile]/[role]/[workflow]`
  - emphasizes the profile, but doesn't match the stated nav.

**Suggested answer:** (a). It matches the user's described drill path
exactly, keeps URLs short, and the role landing page itself can serve as the
"index of workflows for this role." Profile pages live under `/profiles` and
`/profiles/[profile]` independently.

### Q2. Slugs for workflows, profiles, and roles

**Context:** We need stable URL slugs and IDs. The guide and YAMLs already
use specific IDs.

**Suggested answer:**

- Roles: `issuer`, `wallet`, `verifier` (matches existing routes). Internally
  the data model can map `wallet → holder` for the source-doc role name.
- Profiles (match YAML `profile_id` minus the `-v1` for slug clarity, but
  keep `-v1` if the user prefers stability):
  - Slug `vcalm-eddsa` → ID `vcalm-eddsa-v1`
  - Slug `oid4-ecdsa` → ID `oid4-ecdsa-v1`
  - Slug `ob3-direct-delivery` → ID `ob3-direct-delivery-v1`
- Workflows (kebab-case from doc names):
  - `credential-issuance`
  - `credential-acceptance`
  - `credential-request-and-verification`
  - `credential-presentation`
  - `direct-credential-issuance`
  - `direct-credential-verification`

Open sub-question: keep `-v1` in the URL slug, or strip for now?

### Q3. Source of truth for the data — typed content module vs YAML

**Context:** Strada has YAML files that capture each profile's workflow
requirements. We can either (a) hand-curate a typed TS module in this repo
that mirrors them, or (b) parse the YAMLs at build time.

**Suggested answer:** (a) — hand-curate typed content under
`src/lib/interop/` with `ZodFactory` schemas. Reasons:

- Keeps this repo self-contained (no sibling-repo dependency).
- We get TS autocompletion for routes, links, and rendering.
- Small data set (3 profiles × 6 workflows × small step lists). Easy to
  maintain in TS.
- Future option to import from YAML or a CMS without changing route code,
  since pages consume the typed model.

### Q4. Granularity of the checklist on the workflow × profile page

**Context:** Two reasonable shapes for "ordered checklist":

- (i) Just the high-level numbered steps from the doc (e.g. "1. Credential
  Request Initiation", "2. Authentication", …) with short prose.
- (ii) Numbered steps **plus** the MUST/SHOULD requirements grouped under
  each step, each rendered as a checkable item.

**Suggested answer:** (ii). The user described "an ordered checklist of steps
involved that looks like an ordered checklist" and the source profile docs
already have step-grouped requirement bullets. Rendering both gives the
developer a usable implementation aid.

### Q5. Are checkboxes interactive (with persisted progress) or static-visual?

**Context:** "Looks like an ordered checklist" can mean either. A static
checklist is the simplest path; interactive checklists with localStorage
progress is more useful long-term but adds state.

**Suggested answer:** Static-visual for this plan (uses `Checkbox`-styled
markup but no toggle state). Capture interactive progress in a follow-up plan
once we know what other state (per-implementation profile, exports, etc.)
should live alongside it.

### Q6. Does the role landing page list all workflows the role participates in,

or only the workflow×profile combos that exist?

**Context:** A role page can be:

- (i) "Workflows for [role]": lists each unique workflow (e.g. for Issuer:
  Credential Issuance, Direct Credential Issuance) with sub-links per
  profile.
- (ii) "Workflow × Profile combos": flat list of all combos for the role.

**Suggested answer:** (i). It nests cleanly with the URL hierarchy and
mirrors how the source guide groups workflows.

### Q7. Profile detail page contents

**Context:** What appears on `/profiles/[profile]`?

**Suggested answer:**

- Profile name, ID, version, status, last-updated.
- Description + key components (exchange protocol, crypto suite, credential
  format, schema, status method, DID methods, recipient identifier style).
- A table of "Workflows in this profile" with columns: Workflow, Role, Link
  (to the role+workflow+profile checklist).
- "Use cases" bullet list and "Limitations and considerations" notes (where
  the source profile has them, e.g. OB 3.0 Direct's email-control caveats).

### Q8. Where in the AppHeader should the profile section live?

**Context:** Currently the header links to `/wallet`, `/verifier`, `/issuer`
only. We'd like to also expose `/profiles`.

**Suggested answer:** Add a `Profiles` nav link after the three role links.
Keep the existing role-link order.

## Notes

### Resolved defaults (auto-mode, user can redirect)

- **Q1 — Route shape:** `/[role]/[workflow]/[profile]`. Profile pages live at
  `/profiles` and `/profiles/[profile]`.
- **Q2 — Slugs:**
  - Roles: `issuer`, `wallet`, `verifier`.
  - Profile slugs (URL): `vcalm-eddsa`, `oid4-ecdsa`, `ob3-direct-delivery`.
    Profile records keep `id` with `-v1` (`vcalm-eddsa-v1`, etc.) plus a
    `slug` field used for routes.
  - Workflow slugs: `credential-issuance`, `credential-acceptance`,
    `credential-request-and-verification`, `credential-presentation`,
    `direct-credential-issuance`, `direct-credential-verification`.
- **Q3 — Data source:** typed content module under `src/lib/interop/` with
  `ZodFactory` schemas. No YAML import.
- **Q4 — Checklist granularity:** numbered steps + grouped MUST/SHOULD
  requirements as checkable bullet items.
- **Q5 — Interactivity:** static-visual checklists this plan; persistence is
  a future follow-up.
- **Q6 — Role page:** lists each workflow the role participates in, with
  profile sub-options for each.
- **Q7 — Profile detail:** name, ID, version, status, last-updated,
  description, key components, workflows-table (workflow + role + link), use
  cases, limitations / notes (where the source profile has them).
- **Q8 — Header nav:** add a `Profiles` link after the three role links.

### Workflow × profile combinations to render (10 total)

| Role     | Workflow                            | Profile             |
| -------- | ----------------------------------- | ------------------- |
| issuer   | credential-issuance                 | vcalm-eddsa         |
| issuer   | credential-issuance                 | oid4-ecdsa          |
| issuer   | direct-credential-issuance          | ob3-direct-delivery |
| wallet   | credential-acceptance               | vcalm-eddsa         |
| wallet   | credential-acceptance               | oid4-ecdsa          |
| wallet   | credential-presentation             | vcalm-eddsa         |
| wallet   | credential-presentation             | oid4-ecdsa          |
| verifier | credential-request-and-verification | vcalm-eddsa         |
| verifier | credential-request-and-verification | oid4-ecdsa          |
| verifier | direct-credential-verification      | ob3-direct-delivery |
