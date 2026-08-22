<script lang="ts">
	import { WorkflowCard } from '$lib/components/interop/workflow-card/index.js';
	import { roleBySlug, workflowsForRole, type RoleSlug } from '$lib/interop/index.js';
	import { allScenarios } from '$lib/interop/scenarios/index.js';

	let { roleSlug }: { roleSlug: RoleSlug } = $props();

	const role = $derived(roleBySlug(roleSlug)!);
	const workflows = $derived(workflowsForRole(roleSlug));

	/**
	 * The scenarios measuring one workflow in this role.
	 *
	 * This page used to list the profiles that declared a legacy list for each
	 * `(role, workflow)`. M13 deleted the profiles' legacy requirement lists, so the catalog answers
	 * the same question directly — and more honestly, since a profile with no
	 * scenario for a workflow was previously indistinguishable from one with a
	 * legacy list nobody could run.
	 */
	const scenariosFor = (workflow: string) =>
		allScenarios.filter((s) => s.role === roleSlug && s.workflow === workflow);
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">{role.plural}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{role.blurb}</p>
</section>

<section class="mt-12 space-y-6">
	<h2 class="text-headline-md">Workflows</h2>
	<div class="grid gap-6 md:grid-cols-2">
		{#each workflows as workflow (workflow.slug)}
			<WorkflowCard {workflow} {role} scenarios={scenariosFor(workflow.slug)} />
		{/each}
	</div>
</section>
