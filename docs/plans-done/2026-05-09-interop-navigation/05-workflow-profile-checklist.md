# Phase 5 — Workflow × profile checklist routes

## Scope of phase

Add the dynamic checklist routes:

- `src/routes/issuer/[workflow]/[profile]/+page.{ts,svelte}`
- `src/routes/wallet/[workflow]/[profile]/+page.{ts,svelte}`
- `src/routes/verifier/[workflow]/[profile]/+page.{ts,svelte}`

Each renders the `WorkflowChecklist` component for the resolved
combination, prerendered at build time.

## Code Organization Reminders

- The three role-rooted dynamic routes share most of their `+page.ts`
  logic. Extract a shared loader at
  `src/lib/interop/checklist-loader.ts` so each route file is a thin shim.
- Any temporary code gets a `TODO:` comment.

## Style conventions

- Use SvelteKit prerender + entries; no runtime data dependencies.
- 404 with `error(404, …)` from `@sveltejs/kit` on invalid combinations.
- Imports: external → `$lib/` → relative.

## Implementation Details

### Shared loader (`src/lib/interop/checklist-loader.ts`)

```ts
import { error } from '@sveltejs/kit';

import { allCombinations, combinationFor, roleBySlug, workflowBySlug } from './accessors.js';
import { ProfileSlug, RoleSlug, WorkflowSlug } from './profile-schema.js';

export type ChecklistRouteParams = { workflow: string; profile: string };

/** Build the prerender entries() list for a fixed role. */
export function checklistEntriesFor(role: 'issuer' | 'wallet' | 'verifier') {
	return allCombinations()
		.filter((c) => c.role === role)
		.map(({ workflow, profile }) => ({ workflow, profile }));
}

/** Resolve a checklist or throw a 404. */
export function loadChecklist(
	role: 'issuer' | 'wallet' | 'verifier',
	params: ChecklistRouteParams
) {
	const roleSlug = RoleSlug.schema.safeParse(role);
	const workflowSlug = WorkflowSlug.schema.safeParse(params.workflow);
	const profileSlug = ProfileSlug.schema.safeParse(params.profile);

	if (!roleSlug.success || !workflowSlug.success || !profileSlug.success) {
		error(404, 'Unknown role / workflow / profile.');
	}

	const combo = combinationFor(roleSlug.data, workflowSlug.data, profileSlug.data);
	if (!combo) error(404, 'No checklist for that combination.');

	return {
		role: roleBySlug(roleSlug.data)!,
		workflow: workflowBySlug(workflowSlug.data)!,
		profile: combo.profile,
		checklist: combo.checklist
	};
}
```

### Per-role `+page.ts`

```ts
// src/routes/issuer/[workflow]/[profile]/+page.ts
import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

export const entries = () => checklistEntriesFor('issuer');

export function load({ params }) {
	return loadChecklist('issuer', params);
}
```

`wallet` and `verifier` files substitute their role slug. (Skip type
verbosity — SvelteKit's generated `./$types` will infer.)

### Per-role `+page.svelte`

```svelte
<script lang="ts">
	import { WorkflowChecklist as WorkflowChecklistComponent } from '$lib/components/interop/workflow-checklist/index.js';

	let { data } = $props();
</script>

<WorkflowChecklistComponent
	checklist={data.checklist}
	profile={data.profile}
	workflow={data.workflow}
	role={data.role}
/>
```

(Same file used by all three role routes.)

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo build
```

`build` must succeed because `prerender = true` will exercise every
`entries()` combination. Manually walk through a couple of routes in
`pnpm dev` to confirm rendering.
