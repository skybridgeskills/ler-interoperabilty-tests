# Phase 6 — Profile index + detail pages

## Scope of phase

Add the profile section under `/profiles`:

- `src/routes/profiles/+page.svelte` — index listing all profiles via
  `ProfileCard`s.
- `src/routes/profiles/[profile]/+page.{ts,svelte}` — detail page rendering
  `ProfileSummary` + a workflows-table linking to the role × workflow
  checklists belonging to the profile.

## Code Organization Reminders

- Detail page stays thin: imports `ProfileSummary`, the workflows table
  rendered inline. If the table grows past ~80 lines, extract a sibling
  `ProfileWorkflowsTable.svelte` under `src/lib/components/interop/`.
- Any temporary code gets a `TODO:` comment.

## Style conventions

- Tailwind utility classes; reuse layout patterns from the role landings.
- Prerender both routes (`/profiles` and `/profiles/[profile]`).
- Imports: external → `$lib/` → relative.

## Implementation Details

### `/profiles/+page.svelte`

```svelte
<script lang="ts">
	import { allProfiles } from '$lib/interop/index.js';
	import { ProfileCard } from '$lib/components/interop/profile-card/index.js';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">Interoperability profiles</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Each profile bundles a specific combination of credential format, exchange protocol, and
		cryptographic suite into a complete end-to-end set of interoperable workflows.
	</p>
</section>

<section class="mt-12 grid gap-6 md:grid-cols-3">
	{#each allProfiles as profile (profile.slug)}
		<ProfileCard {profile} />
	{/each}
</section>
```

(Add `export const prerender = true;` in a co-located `+page.ts` if
needed; otherwise rely on the global default.)

### `/profiles/[profile]/+page.ts`

```ts
import { error } from '@sveltejs/kit';

import { allProfiles, profileBySlug } from '$lib/interop/index.js';

export const prerender = true;

export const entries = () => allProfiles.map((p) => ({ profile: p.slug }));

export function load({ params }) {
	const profile = profileBySlug(params.profile);
	if (!profile) error(404, 'Unknown profile.');
	return { profile };
}
```

### `/profiles/[profile]/+page.svelte`

```svelte
<script lang="ts">
	import { ProfileSummary } from '$lib/components/interop/profile-summary/index.js';
	import { profileWorkflows } from '$lib/interop/index.js';
	import { resolve } from '$app/paths';

	let { data } = $props();
	const rows = profileWorkflows(data.profile);
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">{data.profile.name}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{data.profile.description}</p>
</section>

<ProfileSummary profile={data.profile} />

<section class="mt-12 space-y-4">
	<h2 class="text-headline-md">Workflows</h2>
	<table class="w-full text-left text-body-md">
		<thead>
			<tr>
				<th class="pb-2">Workflow</th>
				<th class="pb-2">Role</th>
				<th class="pb-2">Checklist</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.workflow.slug + row.role.slug)}
				<tr>
					<td class="py-2">{row.workflow.name}</td>
					<td class="py-2">{row.role.name}</td>
					<td class="py-2">
						<a
							class="text-primary hover:underline"
							href={resolve(`/${row.role.slug}/${row.workflow.slug}/${data.profile.slug}`)}
						>
							Open checklist →
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

{#if data.profile.notes && data.profile.notes.length}
	<section class="mt-12 space-y-4">
		<h2 class="text-headline-md">Notes</h2>
		<ul class="list-disc pl-6 text-body-md text-muted-foreground">
			{#each data.profile.notes as note (note)}
				<li>{note}</li>
			{/each}
		</ul>
	</section>
{/if}
```

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo build
```

All must pass. Walk `/profiles` and `/profiles/<slug>` for each profile to
confirm rendering.
