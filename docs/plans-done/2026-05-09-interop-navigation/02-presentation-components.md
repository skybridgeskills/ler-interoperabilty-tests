# Phase 2 — Presentation components

## Scope of phase

Build the reusable interop UI primitives the routes will compose:

- `RoleBadge` — small chip showing a role with a role-specific colorway.
- `ProfileBadge` — small chip showing a profile, optionally linking to the
  profile detail page.
- `WorkflowCard` — card showing one workflow plus the supported profiles
  (each as a `ProfileBadge` linking to `/[role]/[workflow]/[profile]`).
- `ProfileCard` — card on profile index summarising a profile.
- `ProfileSummary` — key-components table for the profile detail page.
- `WorkflowChecklist` — numbered ordered list of `ChecklistStep` with
  requirements grouped under each step as static checkbox-styled bullets
  (level chip: MUST / SHOULD / MAY).

Each component ships:

- Implementation in `<component>/<Component>.svelte`.
- Storybook story in `<component>/<Component>.stories.svelte` exercising at
  least one nominal variant.
- A barrel `<component>/index.ts` exporting the component.

## Code Organization Reminders

- Prefer a granular file structure, one concept per file.
- Place high-level component first; helpers (variants, types) at the bottom
  or in adjacent files.
- Keep related functionality grouped together (one folder per component).
- Any temporary code gets a `TODO:` comment.

## Style conventions

- Svelte components use `PascalCase.svelte` matching the component name.
- Props are typed with `$props()` (Svelte 5 runes) — keep types inline; if
  they grow beyond ~15 lines, extract to `<component>/types.ts`.
- Use shadcn-svelte primitives where possible (`Card`, `Badge`).
- Tailwind utility classes only (no custom CSS unless unavoidable). Honor
  the Tokyo Night theme tokens (`bg-card`, `text-foreground`,
  `text-primary`, `text-accent`, `border-border`).
- Stories follow the pattern in
  `src/lib/components/ui/badge/Badge.stories.svelte`.
- File size ≤ ~200 lines.
- Imports: external → `$lib/` → relative.

## Implementation Details

### `RoleBadge`

```svelte
<!-- src/lib/components/interop/role-badge/RoleBadge.svelte -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Role } from '$lib/interop/index.js';

	let { role }: { role: Role } = $props();

	const variantBySlug = {
		issuer: 'default',
		wallet: 'secondary',
		verifier: 'outline'
	} as const;
</script>

<Badge variant={variantBySlug[role.slug]}>{role.name}</Badge>
```

Story renders all three roles side-by-side.

### `ProfileBadge`

Props: `{ profile: Profile, href?: string }`. If `href` provided, wraps the
`Badge` in an `<a>`. Use `Badge` variant `outline`. Show profile `name`.

Story: shows linked + unlinked variants.

### `WorkflowCard`

Props: `{ workflow: Workflow, profiles: Profile[], role: Role }`.

Renders:

- `Card` with `CardHeader` containing the workflow `name` as `CardTitle`
  and the `RoleBadge` for the role.
- `CardDescription` with the workflow blurb.
- `CardContent` lists each profile with a `ProfileBadge` linking to
  `/[role.slug]/[workflow.slug]/[profile.slug]` and a small "Open
  checklist →" affordance.

Story: shows the issuer's "Credential Issuance" workflow with both VCALM
and OID4 profiles.

### `ProfileCard`

Props: `{ profile: Profile }`. Renders `Card` with the profile name,
description, key-component summary (top 3 components), and a "View profile"
link to `/profiles/[profile.slug]`.

### `ProfileSummary`

Props: `{ profile: Profile }`. Renders a definition list of key components
plus version + status + last-updated meta. Plain HTML `<dl>` styled with
Tailwind grid.

### `WorkflowChecklist`

Props: `{ checklist: WorkflowChecklist, profile: Profile, workflow: Workflow,
role: Role }`.

Renders:

- A header section with the workflow name, role badge, profile badge.
- An ordered list (`<ol>`) of steps. Each step:
  - Step number + `step.title`.
  - `step.summary` paragraph.
  - Inner `<ul>` of requirements, each item rendered as:
    `<input type="checkbox" disabled aria-label="static" />` + a
    `RequirementLevelBadge` (MUST = destructive, SHOULD = primary, MAY =
    secondary) + the requirement text.
- Footer: short "Source: see [profile name] specification" link to the
  profile detail page (`/profiles/[profile.slug]`).

Helper: `requirement-level-badge.ts` (small) defines the badge variant
mapping. May live as a sibling file.

Story: renders the issuer × credential-issuance × vcalm-eddsa checklist.

## Validate

```
pnpm turbo check
pnpm turbo test
```

Both must pass. Storybook stories are exercised by the storybook Vitest
project.
