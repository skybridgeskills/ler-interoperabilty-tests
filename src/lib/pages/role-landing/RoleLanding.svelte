<script lang="ts">
	import { WorkflowCard } from '$lib/components/interop/workflow-card/index.js';
	import {
		profilesForCombination,
		roleBySlug,
		workflowsForRole,
		type RoleSlug
	} from '$lib/interop/index.js';

	let { roleSlug }: { roleSlug: RoleSlug } = $props();

	const role = $derived(roleBySlug(roleSlug)!);
	const workflows = $derived(workflowsForRole(roleSlug));
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
