<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		type AdditiveProfileSlug,
		type Profile,
		type Role,
		type Workflow
	} from '$lib/interop/index.js';

	import { RoleBadge } from '../role-badge/index.js';

	/**
	 * Shopping-cart-style row for one (role, workflow, profile) combination.
	 * Selected rows are prominent; unselected rows are de-emphasized but still
	 * readable and navigable. Purely presentational.
	 *
	 * **Statusless.** It used to carry the combination's run history; that store
	 * is gone, and a combination is not a scenario, so there is nothing to show.
	 * The row survives only to list combinations that have not been migrated
	 * yet, and is deleted with them.
	 */
	let {
		combination,
		selected,
		href,
		appliedAdditives = []
	}: {
		combination: { role: Role; workflow: Workflow; profile: Profile };
		selected: boolean;
		href: string;
		/** Selected additive profiles that apply to this row's combination. */
		appliedAdditives?: { slug: AdditiveProfileSlug; name: string }[];
	} = $props();
</script>

<div
	class={`flex flex-col gap-3 rounded-md border p-3 transition ${
		selected ? 'border-primary bg-card' : 'border-border bg-card/40 opacity-65 hover:opacity-100'
	}`}
>
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<RoleBadge role={combination.role} />

		<div class="min-w-0 flex-1">
			<p class={`truncate text-body-md ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
				{combination.workflow.name}
			</p>
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="truncate text-label-md text-muted-foreground">{combination.profile.name}</span>
				{#each appliedAdditives as additive (additive.slug)}
					<Badge variant="outline" class="text-[0.7rem]">+ {additive.name}</Badge>
				{/each}
			</div>
		</div>

		<a
			{href}
			class="shrink-0 text-label-md text-primary hover:underline"
			aria-label={`Open checklist for ${combination.role.name} · ${combination.workflow.name} · ${combination.profile.name}`}
		>
			Open checklist →
		</a>
	</div>
</div>
