<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type {
		AdditiveProfileSlug,
		Profile,
		Role,
		TestRunRecord,
		Workflow
	} from '$lib/interop/index.js';

	import { RoleBadge } from '../role-badge/index.js';
	import { RunResultBadge } from '../run-result-badge/index.js';

	/**
	 * Shopping-cart-style row for one (role, workflow, profile) combination.
	 * Selected rows are prominent; unselected rows are de-emphasized but still
	 * readable and navigable. Presentational — selection/run data come via props.
	 */
	let {
		combination,
		selected,
		latestRun,
		href,
		appliedAdditives = []
	}: {
		combination: { role: Role; workflow: Workflow; profile: Profile };
		selected: boolean;
		latestRun?: TestRunRecord;
		href: string;
		/** Selected additive profiles that apply to this row's combination. */
		appliedAdditives?: { slug: AdditiveProfileSlug; name: string }[];
	} = $props();
</script>

<div
	class={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border p-3 transition ${
		selected ? 'border-primary bg-card' : 'border-border bg-card/40 opacity-65 hover:opacity-100'
	}`}
>
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

	<RunResultBadge record={latestRun} />

	<a
		{href}
		class="shrink-0 text-label-md text-primary hover:underline"
		aria-label={`Open checklist for ${combination.role.name} · ${combination.workflow.name} · ${combination.profile.name}`}
	>
		Open checklist →
	</a>
</div>
