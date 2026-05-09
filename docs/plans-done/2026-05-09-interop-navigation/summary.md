# 2026-05-09 — Interop Navigation: Summary

## What shipped

A navigation IA that lets developers drill from a high-level workflow
overview into the exact ordered checklist of implementation steps for a
specific role × workflow × interoperability profile.

### Typed content module — `src/lib/interop/`

- `profile-schema.ts` — `RoleSlug`, `WorkflowSlug`, `ProfileSlug`,
  `ChecklistRequirement`, `ChecklistStep`, `WorkflowChecklist`,
  `ProfileKeyComponent`, `Profile` (all built with `ZodFactory`).
- `roles.ts`, `workflows.ts`, `workflow-groups.ts` — canonical role,
  workflow, and conceptual-pair definitions.
- `profiles/vcalm-eddsa/`, `profiles/oid4-ecdsa/`,
  `profiles/ob3-direct-delivery/` — per-profile data, with one file per
  (role × workflow) checklist + a `profile.ts` and an `index.ts` that
  composes them. `profiles/all-profiles.ts` registers the three.
- `accessors.ts` — `profileBySlug`, `roleBySlug`, `workflowBySlug`,
  `workflowsForRole`, `profilesForCombination`, `combinationFor`,
  `allCombinations`, `profileWorkflows`.
- `checklist-href.ts` — typed URL helpers (`checklistHref`, `profileHref`,
  `roleHref`) that wrap SvelteKit's `resolve()`.
- `checklist-loader.ts` — shared SvelteKit `entries()` + `load()` helpers
  for the per-role dynamic checklist routes.
- `index.ts` — public barrel.

### UI components — `src/lib/components/interop/`

- `RoleBadge`, `ProfileBadge` — small chip primitives.
- `WorkflowCard` — workflow summary card with profile sub-links.
- `ProfileCard` — profile-index card.
- `ProfileSummary` — definition-list of profile metadata + key components
  for the profile detail page.
- `WorkflowChecklist` — numbered ordered list of steps; each step renders
  its summary plus checkbox-styled MUST / SHOULD / MAY requirement bullets.

Each component ships an `index.ts` and a `*.stories.svelte`. Stories
provide `args` defaults so the storybook Vitest project can run them.

### Routes

- `/` (`LandingPage`): hero + role cards + grouped workflow overview.
- `/issuer`, `/wallet`, `/verifier`: render the shared `RoleLanding`
  component, which lists the role's workflows with `WorkflowCard`s.
- `/[role]/[workflow]/[profile]` (issuer/wallet/verifier): prerendered
  checklist pages, 10 valid combinations.
- `/profiles`: profile index.
- `/profiles/[profile]`: profile detail with summary + workflow links.
- `AppHeader` gains a `Profiles` nav link.

### Refactors

- `ZodFactory` moved from `src/lib/server/util/` to `src/lib/util/` so
  client-side code can import it.
- Removed unused `src/lib/components/coming-soon/` (no longer referenced).
- Updated `src/routes/page.svelte.spec.ts` to assert against the new
  landing-page structure (heading anchors).

### Validation

`pnpm turbo validate` passes:

- prettier ✓
- eslint ✓
- svelte-check (typescript) ✓
- vitest (server + client + storybook): 82 tests, 27 files ✓
- production build with prerender of all 10 checklist combos and 3
  profile detail pages ✓

## Out of scope (future work)

- Persisted checklist progress (e.g. localStorage or per-implementation
  account state).
- Storybook coverage for the page-level routes.
- Generating content from the Strada YAML so the data stays in lockstep
  with the source guide.
- Cross-link from each step to the source guide URL.
- Profile diff / comparison views.
