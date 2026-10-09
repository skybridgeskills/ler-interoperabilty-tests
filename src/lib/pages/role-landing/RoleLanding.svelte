<script lang="ts">
	import { perspectiveStore } from '$lib/client/perspective/index.js';
	import { WorkflowCard } from '$lib/components/interop/workflow-card/index.js';
	import { PageHero } from '$lib/components/page-hero/index.js';
	import { roleBySlug, workflowsForRole, type RoleSlug } from '$lib/interop/index.js';
	import { allScenarios } from '$lib/interop/scenarios/index.js';

	import { resolve } from '$app/paths';

	let { roleSlug }: { roleSlug: RoleSlug } = $props();

	const perspective = perspectiveStore();

	const role = $derived(roleBySlug(roleSlug)!);
	const workflows = $derived(workflowsForRole(roleSlug));

	/**
	 * The scenarios measuring one workflow in this role.
	 *
	 * This page used to list the profiles that declared a pre-scenario checklist for each
	 * `(role, workflow)`. M13 deleted the profiles' pre-scenario checklists, so the catalog answers
	 * the same question directly — and more honestly, since a profile with no
	 * scenario for a workflow was previously indistinguishable from one with a
	 * pre-scenario checklist nobody could run.
	 */
	const scenariosFor = (workflow: string) =>
		allScenarios.filter((s) => s.role === roleSlug && s.workflow === workflow);
</script>

<PageHero perspective={perspective.current} onPerspectiveChange={(p) => perspective.choose(p)}>
	{#snippet breadcrumb()}
		<a href={resolve('/')} class="text-primary hover:underline">Home</a>
	{/snippet}
	{#snippet eyebrow()}Role{/snippet}
	{#snippet title()}{role.plural}{/snippet}
	{#snippet lede()}{role.blurb}{/snippet}
</PageHero>

<section class="mt-12 space-y-6">
	<h2 class="text-headline-md">Workflows</h2>
	<div class="grid gap-6 md:grid-cols-2">
		{#each workflows as workflow (workflow.slug)}
			<WorkflowCard {workflow} {role} scenarios={scenariosFor(workflow.slug)} />
		{/each}
	</div>
</section>
