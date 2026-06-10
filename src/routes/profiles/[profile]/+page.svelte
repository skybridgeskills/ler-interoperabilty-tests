<script lang="ts">
	import { ProfileSummary } from '$lib/components/interop/profile-summary/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import {
		checklistHref,
		type Profile,
		profileBySlug,
		profileHref,
		profileWorkflows,
		roleBySlug,
		workflowBySlug
	} from '$lib/interop/index.js';

	let { data } = $props();

	const baseRows = $derived(data.kind === 'base' ? profileWorkflows(data.profile) : []);

	const additiveRows = $derived.by(() => {
		if (data.kind !== 'additive') return [];
		const baseSlugs = data.profile.appliesToBaseProfiles;
		return data.profile.checklists.map((c) => {
			// One link per applicable base profile that has this (role, workflow);
			// each base checklist page renders the combined view including this additive.
			const bases = baseSlugs
				.map((slug) => profileBySlug(slug))
				.filter((p): p is Profile => p !== undefined)
				.filter((p) => p.checklists.some((bc) => bc.role === c.role && bc.workflow === c.workflow))
				.map((p) => ({ name: p.name, href: checklistHref(c.role, c.workflow, p.slug) }));
			return {
				workflow: workflowBySlug(c.workflow)!,
				role: roleBySlug(c.role)!,
				stepCount: c.steps.length,
				bases
			};
		});
	});

	const compatibleBaseProfiles = $derived(
		data.kind === 'additive'
			? data.profile.appliesToBaseProfiles
					.map((slug) => profileBySlug(slug))
					.filter(<T,>(p: T | undefined): p is T => p !== undefined)
			: []
	);
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		{#if data.kind === 'additive'}
			<span
				class="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-label-md text-primary"
			>
				Additive profile
			</span>
		{/if}
		<h1 class="text-display-lg">{data.profile.name}</h1>
	</div>
	<p class="max-w-prose text-body-md text-muted-foreground">{data.profile.description}</p>
</section>

{#if data.kind === 'base'}
	<ProfileSummary profile={data.profile} />

	<section class="mt-12 max-w-2xl space-y-4">
		<h2 class="text-headline-md">Workflows</h2>
		<ul class="space-y-2">
			{#each baseRows as row (row.workflow.slug + row.role.slug)}
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
{:else}
	<section class="mt-12 max-w-2xl space-y-4">
		<h2 class="text-headline-md">Applies to</h2>
		<ul class="space-y-2">
			{#each compatibleBaseProfiles as base (base.slug)}
				<li>
					<a
						class="group flex items-start justify-between gap-4 rounded-md border border-border p-4 transition hover:border-primary"
						href={profileHref(base.slug)}
					>
						<div class="space-y-1">
							<span class="text-body-md font-medium text-foreground">{base.name}</span>
							<p class="text-label-md text-muted-foreground">{base.description}</p>
						</div>
						<span class="shrink-0 self-center text-label-md text-primary group-hover:underline">
							Open →
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="mt-12 max-w-2xl space-y-4">
		<h2 class="text-headline-md">Additive checklists</h2>
		<p class="max-w-prose text-body-md text-muted-foreground">
			These checklists layer on top of the corresponding base-profile checklists when this additive
			profile is selected. Open the base profile's checklist to see the combined view.
		</p>
		<ul class="space-y-2">
			{#each additiveRows as row (row.workflow.slug + row.role.slug)}
				<li
					class="flex flex-wrap items-start justify-between gap-4 rounded-md border border-border p-4"
				>
					<div class="space-y-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-body-md font-medium text-foreground">{row.workflow.name}</span>
							<RoleBadge role={row.role} />
						</div>
						<p class="text-label-md text-muted-foreground">
							{row.stepCount}
							{row.stepCount === 1 ? 'step' : 'steps'}
						</p>
					</div>
					{#if row.bases.length}
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1 self-center">
							<span class="text-label-md text-muted-foreground">Open in:</span>
							{#each row.bases as base (base.href)}
								<a class="text-label-md text-primary hover:underline" href={base.href}>
									{base.name} →
								</a>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
