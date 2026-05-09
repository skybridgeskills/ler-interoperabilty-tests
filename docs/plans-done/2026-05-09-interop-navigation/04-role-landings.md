# Phase 4 — Role landing pages

## Scope of phase

Replace the `ComingSoon` placeholder pages at `/issuer`, `/wallet`, and
`/verifier` with role landing pages that:

- Show the role name + blurb.
- List the workflows that role participates in (from `workflowsForRole`).
- For each workflow, render a `WorkflowCard` with the supported profiles
  (`profilesForCombination(role, workflow)`), each linking to
  `/[role]/[workflow]/[profile]`.

## Code Organization Reminders

- The three role pages are very similar but role-specific; render them
  inline in their respective `+page.svelte` files rather than going through
  `lib/pages/`. If the inline content grows past ~80 lines, extract a
  shared `RoleLanding.svelte` under `src/lib/pages/role-landing/`.
- Any temporary code gets a `TODO:` comment.

## Style conventions

- Tailwind utility classes only; reuse layout patterns from `LandingPage`.
- Imports: external → `$lib/` → relative.

## Implementation Details

### Shared component approach

Add `src/lib/pages/role-landing/RoleLanding.svelte`:

```svelte
<script lang="ts">
	import {
		profilesForCombination,
		roleBySlug,
		workflowsForRole,
		type RoleSlug
	} from '$lib/interop/index.js';
	import { WorkflowCard } from '$lib/components/interop/workflow-card/index.js';

	let { roleSlug }: { roleSlug: RoleSlug } = $props();
	const role = roleBySlug(roleSlug)!;
	const workflows = workflowsForRole(roleSlug);
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">{role.plural}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{role.blurb}</p>
</section>

<section class="mt-12 space-y-6">
	<h2 class="text-headline-md">Workflows</h2>
	<div class="grid gap-6 md:grid-cols-2">
		{#each workflows as workflow (workflow.slug)}
			<WorkflowCard {workflow} {role} profiles={profilesForCombination(role.slug, workflow.slug)} />
		{/each}
	</div>
</section>
```

Each role's `+page.svelte` becomes:

```svelte
<script lang="ts">
	import { RoleLanding } from '$lib/pages/role-landing/index.js';
</script>

<RoleLanding roleSlug="issuer" />
```

(`wallet` / `verifier` substitute their slug.)

### `index.ts`

```ts
export { default as RoleLanding } from './RoleLanding.svelte';
```

### Story (optional but encouraged)

Add `RoleLanding.stories.svelte` rendering the three roles in succession
so storybook can exercise them visually.

## Validate

```
pnpm turbo check
pnpm turbo test
```

Both must pass. Manually load `/issuer`, `/wallet`, `/verifier` in `pnpm
dev` to confirm cards render and clicking a profile drills into a 404
(checklist routes land in phase 5).
