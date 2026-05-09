<script lang="ts">
	import { ProfileSummary } from '$lib/components/interop/profile-summary/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import { checklistHref, profileWorkflows } from '$lib/interop/index.js';

	let { data } = $props();

	const rows = $derived(profileWorkflows(data.profile));
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">{data.profile.name}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{data.profile.description}</p>
</section>

<ProfileSummary profile={data.profile} />

<section class="mt-12 max-w-2xl space-y-4">
	<h2 class="text-headline-md">Workflows</h2>
	<ul class="space-y-2">
		{#each rows as row (row.workflow.slug + row.role.slug)}
			<li>
				<a
					class="group flex items-start justify-between gap-4 rounded-md border border-border p-4 transition hover:border-primary"
					href={checklistHref(row.role.slug, row.workflow.slug, data.profile.slug)}
				>
					<div class="space-y-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-body-md font-medium text-foreground">{row.workflow.name}</span>
							<RoleBadge role={row.role} />
						</div>
						<p class="text-label-md text-muted-foreground">{row.workflow.blurb}</p>
					</div>
					<span class="shrink-0 self-center text-label-md text-primary group-hover:underline">
						Open →
					</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

{#if data.profile.notes && data.profile.notes.length}
	<section class="mt-12 space-y-4">
		<h2 class="text-headline-md">Notes</h2>
		<ul class="list-disc space-y-1 pl-6 text-body-md text-muted-foreground">
			{#each data.profile.notes as note (note)}
				<li>{note}</li>
			{/each}
		</ul>
	</section>
{/if}
