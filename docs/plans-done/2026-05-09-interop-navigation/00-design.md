# 2026-05-09 — Interop Navigation: Design

## Scope of work

Build the navigation IA for the LER Interoperability Test Suite so a developer
can drill from a high-level workflow overview into the exact ordered checklist
of steps for a particular role + workflow + interoperability profile. Add a
parallel `/profiles` section so a profile can be inspected as its own first-class
artifact.

In scope:

- A typed content module describing roles, workflows, profiles, and ordered
  checklist steps for each valid `(role, workflow, profile)` combination.
- A reusable set of presentation components (cards, badges, checklist).
- New / refactored routes:
  - Home overview of all workflows (replaces current placeholder landing).
  - Role landings (`/issuer`, `/wallet`, `/verifier`) listing the role's
    workflows with profile sub-options.
  - Workflow × profile checklists at `/[role]/[workflow]/[profile]`.
  - Profile index (`/profiles`) and profile detail (`/profiles/[profile]`).
- AppHeader gets a `Profiles` link.

Out of scope (deferred):

- Conformance test execution / fixtures / wallet-style interactive tooling.
- Persisted checklist progress, accounts, or any server state.
- Trust registry / status list verification UIs.
- Authoring / editing UI for content.
- API endpoints — pages render directly from the typed content module.

## File structure

```
ler-interoperability-test-suite/
├── docs/plans/2026-05-09-interop-navigation/
│   ├── 00-notes.md                                  # NEW (already written)
│   ├── 00-design.md                                 # NEW (this file)
│   ├── 01-content-model.md                          # NEW
│   ├── 02-presentation-components.md                # NEW
│   ├── 03-home-and-header.md                        # NEW
│   ├── 04-role-landings.md                          # NEW
│   ├── 05-workflow-profile-checklist.md             # NEW
│   ├── 06-profile-pages.md                          # NEW
│   └── 07-cleanup-and-validation.md                 # NEW
└── src/
    ├── lib/
    │   ├── interop/                                 # NEW: typed content + accessors
    │   │   ├── index.ts                             # NEW: public barrel
    │   │   ├── roles.ts                             # NEW: Role schema + role list
    │   │   ├── roles.test.ts                        # NEW
    │   │   ├── workflows.ts                         # NEW: Workflow schema + workflow list
    │   │   ├── workflows.test.ts                    # NEW
    │   │   ├── profiles/
    │   │   │   ├── profile-schema.ts                # NEW: Profile + ChecklistStep + ChecklistRequirement
    │   │   │   ├── profile-schema.test.ts           # NEW
    │   │   │   ├── vcalm-eddsa.ts                   # NEW: VCALM-EdDSA profile + checklists
    │   │   │   ├── oid4-ecdsa.ts                    # NEW: OID4-ECDSA profile + checklists
    │   │   │   ├── ob3-direct-delivery.ts           # NEW: OB 3.0 Direct profile + checklists
    │   │   │   └── all-profiles.ts                  # NEW: registry list
    │   │   ├── accessors.ts                         # NEW: profileBySlug, workflowsForRole, …
    │   │   └── accessors.test.ts                    # NEW
    │   ├── components/
    │   │   ├── app-header/
    │   │   │   └── AppHeader.svelte                 # UPDATE: add Profiles link
    │   │   └── interop/                             # NEW: interop-specific UI
    │   │       ├── role-badge/
    │   │       │   ├── RoleBadge.svelte             # NEW
    │   │       │   ├── RoleBadge.stories.svelte     # NEW
    │   │       │   └── index.ts                     # NEW
    │   │       ├── profile-badge/
    │   │       │   ├── ProfileBadge.svelte          # NEW
    │   │       │   ├── ProfileBadge.stories.svelte  # NEW
    │   │       │   └── index.ts                     # NEW
    │   │       ├── workflow-card/
    │   │       │   ├── WorkflowCard.svelte          # NEW
    │   │       │   ├── WorkflowCard.stories.svelte  # NEW
    │   │       │   └── index.ts                     # NEW
    │   │       ├── profile-card/
    │   │       │   ├── ProfileCard.svelte           # NEW
    │   │       │   ├── ProfileCard.stories.svelte   # NEW
    │   │       │   └── index.ts                     # NEW
    │   │       ├── workflow-checklist/
    │   │       │   ├── WorkflowChecklist.svelte     # NEW (numbered steps + grouped reqs)
    │   │       │   ├── WorkflowChecklist.stories.svelte # NEW
    │   │       │   └── index.ts                     # NEW
    │   │       └── profile-summary/
    │   │           ├── ProfileSummary.svelte        # NEW (key components table)
    │   │           ├── ProfileSummary.stories.svelte# NEW
    │   │           └── index.ts                     # NEW
    │   └── pages/
    │       ├── LandingPage.svelte                   # UPDATE: workflows overview
    │       └── LandingPage.stories.svelte           # UPDATE
    └── routes/
        ├── +page.svelte                             # unchanged: renders LandingPage
        ├── issuer/
        │   ├── +page.svelte                         # UPDATE: render RoleLanding
        │   └── [workflow]/
        │       └── [profile]/
        │           ├── +page.ts                     # NEW: load + entries (prerender)
        │           └── +page.svelte                 # NEW: WorkflowChecklist
        ├── wallet/
        │   ├── +page.svelte                         # UPDATE
        │   └── [workflow]/[profile]/+page.{ts,svelte}  # NEW
        ├── verifier/
        │   ├── +page.svelte                         # UPDATE
        │   └── [workflow]/[profile]/+page.{ts,svelte}  # NEW
        └── profiles/
            ├── +page.svelte                         # NEW: profile index
            └── [profile]/
                ├── +page.ts                         # NEW: load + entries
                └── +page.svelte                     # NEW: profile detail
```

Notes:

- Per-role nested dynamic routes are repeated three times rather than being
  collapsed into a single `/[role]/[workflow]/[profile]` route. This keeps the
  three role landing pages as distinct files (no content shared via `[role]`
  matching), avoids overlap with profile-index path resolution, and lets each
  role page own its layout / copy. The dynamic checklist `+page.ts` is
  near-identical across the three roles; it imports the same loader helper
  from `src/lib/interop/`.
- The shared `LandingPage` lives in `src/lib/pages/` per the existing pattern
  (mirrors how the scaffold built it). Role landings render inline from the
  route file rather than going through `lib/pages/` because they're
  role-specific.

## Conceptual architecture

```
┌─ Source data (typed content) ─────────────────────────────────────┐
│  src/lib/interop/                                                  │
│   ├─ profile-schema (ZodFactory)                                   │
│   │     Profile, Workflow, Role, ChecklistStep, ChecklistRequirement │
│   │     Combination = (role, workflow, profile, steps[])           │
│   ├─ profile data files (one per profile)                          │
│   │     export const vcalmEddsa: Profile = {...}                   │
│   │     plus checklists keyed by (role × workflow)                 │
│   └─ accessors                                                     │
│         profileBySlug, workflowsForRole, combinationFor(...),      │
│         allCombinations(), profileWorkflows(profile)               │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─ Presentation components (src/lib/components/interop/) ───────────┐
│   RoleBadge        — small role chip with role colorway           │
│   ProfileBadge     — small profile chip linking to profile detail │
│   WorkflowCard     — card showing a workflow + supported profiles │
│   ProfileCard      — card on profile index                        │
│   ProfileSummary   — key-components table on profile detail page  │
│   WorkflowChecklist — numbered step list with requirement bullets │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─ Routes ──────────────────────────────────────────────────────────┐
│   /                      LandingPage           (workflows overview)│
│   /issuer    /wallet    /verifier               (role landings)   │
│   /[role]/[workflow]/[profile]                  (checklist)       │
│   /profiles                                     (profile index)   │
│   /profiles/[profile]                           (profile detail)  │
└────────────────────────────────────────────────────────────────────┘
```

### Data model

```ts
// src/lib/interop/profile-schema.ts (sketch)

export const RoleSlug = ZodFactory(z.enum(['issuer', 'wallet', 'verifier']));
export type RoleSlug = ReturnType<typeof RoleSlug>;

export const WorkflowSlug = ZodFactory(
	z.enum([
		'credential-issuance',
		'credential-acceptance',
		'credential-request-and-verification',
		'credential-presentation',
		'direct-credential-issuance',
		'direct-credential-verification'
	])
);

export const ProfileSlug = ZodFactory(z.enum(['vcalm-eddsa', 'oid4-ecdsa', 'ob3-direct-delivery']));

export const ChecklistRequirement = ZodFactory(
	z.object({
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		text: z.string()
	})
);

export const ChecklistStep = ZodFactory(
	z.object({
		title: z.string(), // e.g. "Credential Request Initiation"
		summary: z.string(), // 1–3 sentences
		requirements: z.array(ChecklistRequirement)
	})
);

export const WorkflowChecklist = ZodFactory(
	z.object({
		role: RoleSlug,
		workflow: WorkflowSlug,
		profile: ProfileSlug,
		steps: z.array(ChecklistStep)
	})
);

export const ProfileKeyComponent = ZodFactory(z.object({ label: z.string(), value: z.string() }));

export const Profile = ZodFactory(
	z.object({
		id: z.string(), // "vcalm-eddsa-v1"
		slug: ProfileSlug, // "vcalm-eddsa"
		name: z.string(), // "VCALM-EdDSA Profile"
		version: z.string(), // "0.1"
		status: z.string(), // "Editor's Draft"
		lastUpdated: z.string(), // ISO date
		description: z.string(),
		keyComponents: z.array(ProfileKeyComponent),
		useCases: z.array(z.string()),
		notes: z.array(z.string()).optional(), // limitations / considerations
		checklists: z.array(WorkflowChecklist)
	})
);
```

### Routing model

- All routes are statically prerenderable. Each dynamic `+page.ts` exports
  `entries()` returning the valid slug combinations from `allCombinations()`
  (or, for `/profiles/[profile]`, all profile slugs). Set `prerender = true`.
- Dynamic `+page.ts` `load` returns the resolved combination + profile so the
  `+page.svelte` is a thin renderer.
- Invalid slug combinations 404 via `error(404, …)` from `@sveltejs/kit`.

## Style conventions

Drawn from `docs/style/README.md`, `philosophy.md`, `naming.md`,
`factory-functions.md`, `providers.md`, `schemas.md`, `file-organization.md`,
`documentation.md`, and `AGENTS.md`. Apply to every phase of this plan.

- **Factory functions, not classes.** Any helper that returns a service /
  bag of methods uses `function Foo(...) { return { ... } }` with
  `export type Foo = ReturnType<typeof Foo>`.
- **`ZodFactory` for shared schemas.** All content shapes (`Profile`,
  `WorkflowChecklist`, etc.) are defined with `ZodFactory` so we get one
  source of truth for runtime parsing + TS types.
- **Domain-first layout.** All interop content + accessors live under
  `src/lib/interop/`. Per-profile data lives in
  `src/lib/interop/profiles/<profile-slug>.ts`. UI components live under
  `src/lib/components/interop/<component-kebab-case>/`.
- **File size ≤ ~200 lines.** Per-profile files may approach the limit
  because of step + requirement copy. If a single profile file exceeds 200
  lines, split per-checklist files (`vcalm-eddsa/credential-issuance.ts`)
  and re-aggregate in `vcalm-eddsa/index.ts`.
- **Order by abstraction.** Public exports first (the matching name),
  helpers below, types last.
- **Naming.**
  - Files: `kebab-case.ts`. Co-located tests: `<file>.test.ts`.
  - Svelte components: `PascalCase.svelte` matching the component name.
  - Accessors / actions: camelCase verb-or-noun (`profileBySlug`,
    `workflowsForRole`, `allCombinations`).
  - Types: `PascalCase`.
- **Imports.** Three groups separated by blank lines:
  1. external (npm)
  2. `$lib/` / workspace
  3. relative
- **Stories.** Every reusable interop component ships a `*.stories.svelte`
  exercising at least one nominal variant.
- **Tests.** Co-locate as `*.test.ts` next to the code under test.
  - Schema validation tests in node Vitest (`*.test.ts`).
  - Component render tests in browser Vitest (`*.svelte.test.ts`) where
    behavior justifies it; otherwise rely on stories + the storybook Vitest
    project.
- **Documentation.** Add TSDoc on the public schemas and accessor exports.
  Page components don't need TSDoc unless they expose non-obvious props.
- **No commits between phases** unless explicitly requested; the cleanup
  phase commits the whole plan.

## Main components and how they interact

- **Content module (`src/lib/interop/`)** is the single source of truth.
  Pages and components import only from `src/lib/interop/index.ts`.
- **`Profile` records carry their own checklists.** Looking up a checklist
  is `profile.checklists.find(c => c.role === r && c.workflow === w)`.
  Accessors wrap this so callers don't reach into shapes directly.
- **Role landings** render a `WorkflowCard` for each workflow the role
  participates in. Each card shows the supported profiles via
  `ProfileBadge` linking to either `/profiles/[profile]` or directly to
  `/[role]/[workflow]/[profile]` (the in-context drill-down path).
- **Workflow checklist page** renders `WorkflowChecklist` for the matched
  combination. Renders a "back" affordance to the role landing.
- **Profile detail page** renders `ProfileSummary` plus a workflows table
  and links into each `/[role]/[workflow]/[profile]` for that profile's
  checklists.
- **AppHeader** gains a `Profiles` link without changing other behavior.
- **LandingPage** lists all six workflow titles, each linking to all
  matching role landings (e.g. "Credential Issuance — Issuer →
  /issuer/credential-issuance via VCALM-EdDSA / OID4-ECDSA"). Surface
  profile chips so users can also drop into a profile detail page.

## Validation gates per phase

Each phase ends with `pnpm turbo check` and `pnpm turbo test`. The cleanup
phase additionally runs `pnpm turbo build` (or `pnpm turbo validate` to do
all three).

## Open follow-ups (after this plan ships)

- Persisted checklist progress (per-implementation or via account/session).
- Cross-link to the source guide (`learningmobilitycollaborative.org` / Strada
  hosting) for citations under each step.
- Storybook coverage for the page-level routes.
- Generated content from the Strada YAML so the data stays in lockstep.
