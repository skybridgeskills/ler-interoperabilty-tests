<script lang="ts">
	import { onMount } from 'svelte';

	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveChecklistSection } from '$lib/components/interop/additive-checklist-section/index.js';
	import { InlineMarkup } from '$lib/components/interop/inline-markup/index.js';
	import { ProfileBadge } from '$lib/components/interop/profile-badge/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		profileHref,
		type AdditiveProfile,
		type ChecklistStep,
		type Profile,
		type Role,
		type Workflow,
		type WorkflowChecklist as WorkflowChecklistData
	} from '$lib/interop/index.js';

	import { requirementLevelClass, requirementLevelVariant } from './requirement-level-badge.js';

	let {
		checklist,
		profile,
		workflow,
		role,
		additives = []
	}: {
		checklist: WorkflowChecklistData;
		profile: Profile;
		workflow: Workflow;
		role: Role;
		/** Applicable additive checklist(s), rendered as combined-view sections. */
		additives?: { additive: AdditiveProfile; checklist: WorkflowChecklistData }[];
	} = $props();

	onMount(() => {
		selectionStore.hydrate();
	});
</script>

{#snippet stepList(steps: ChecklistStep[], headingTag: 'h2' | 'h3')}
	<ol class="space-y-10">
		{#each steps as step, i (step.title)}
			<li class="space-y-3">
				<header class="flex items-baseline gap-3">
					<span class="text-headline-md font-mono text-primary">{i + 1}.</span>
					<svelte:element this={headingTag} class="text-headline-md">{step.title}</svelte:element>
				</header>
				<InlineMarkup
					text={step.summary}
					class="block max-w-prose text-body-md text-muted-foreground"
				/>
				{#if step.requirements.length}
					<ul class="space-y-2 pl-6">
						{#each step.requirements as req (req.text)}
							<li class="flex items-start gap-3">
								<input
									type="checkbox"
									disabled
									class="mt-1 size-4 shrink-0 rounded border-border bg-card"
									aria-label="static"
								/>
								<span class="flex flex-wrap items-baseline gap-2">
									<Badge
										variant={requirementLevelVariant[req.level]}
										class={requirementLevelClass[req.level]}>{req.level}</Badge
									>
									<InlineMarkup text={req.text} class="text-body-md text-foreground" />
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

<section class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<RoleBadge {role} />
		<ProfileBadge {profile} href={profileHref(profile.slug)} />
	</div>
	<h1 class="text-display-lg">{workflow.name}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{workflow.blurb}</p>
</section>

<div class="mt-12">
	{@render stepList(checklist.steps, 'h2')}
</div>

{#each additives as { additive, checklist: additiveChecklist } (additive.slug)}
	<AdditiveChecklistSection
		{additive}
		checklist={additiveChecklist}
		baseProfileName={profile.name}
		selected={selectionStore.isAdditiveProfileSelected(additive.slug)}
		onToggle={selectionStore.toggleAdditiveProfile}
		{stepList}
	/>
{/each}

<footer class="mt-16 text-label-md text-muted-foreground">
	Source: see the
	<a class="text-primary hover:underline" href={profileHref(profile.slug)}>
		{profile.name}
	</a>
	specification.
</footer>
