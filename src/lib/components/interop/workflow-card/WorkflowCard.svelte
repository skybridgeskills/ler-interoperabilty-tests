<script lang="ts">
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { scenarioHref, type Role, type Workflow } from '$lib/interop/index.js';
	import type { Scenario } from '$lib/interop/scenarios/index.js';

	/**
	 * One workflow a role participates in, and the scenarios that measure it.
	 *
	 * It used to list **profiles**, each linking to that `(role, workflow,
	 * profile)` legacy page. M13 deleted those pages, and the scenario is the
	 * runnable unit now — so the card lists what can actually be run.
	 */
	let { workflow, role, scenarios }: { workflow: Workflow; role: Role; scenarios: Scenario[] } =
		$props();
</script>

<Card>
	<CardHeader>
		<div class="flex items-start justify-between gap-4">
			<CardTitle>{workflow.name}</CardTitle>
			<RoleBadge {role} />
		</div>
		<CardDescription>{workflow.blurb}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if scenarios.length === 0}
			<p class="text-body-md text-muted-foreground">No scenarios measure this workflow yet.</p>
		{:else}
			<p class="mb-3 text-label-md text-muted-foreground">Run a scenario:</p>
			<ul class="space-y-2">
				{#each scenarios as scenario (scenario.slug)}
					<li>
						<a
							class="flex items-center justify-between gap-3 text-body-md text-foreground hover:text-primary"
							href={scenarioHref(scenario.slug)}
						>
							<span>{scenario.name}</span>
							<span class="text-label-md text-muted-foreground">Open →</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</CardContent>
</Card>
