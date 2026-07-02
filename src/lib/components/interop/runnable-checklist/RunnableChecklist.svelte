<script lang="ts">
	import type { Snippet } from 'svelte';

	import { ProfileBadge } from '$lib/components/interop/profile-badge/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		profileHref,
		type ChecklistRunState,
		type Profile,
		type Role,
		type StepRunState,
		type Workflow,
		type WorkflowChecklist as WorkflowChecklistData
	} from '$lib/interop/index.js';

	import { StepRunStateIndicator } from '../exchange-runner/step-run-state-indicator/index.js';
	import {
		requirementLevelClass,
		requirementLevelVariant
	} from '../workflow-checklist/requirement-level-badge.js';

	let {
		checklist,
		profile,
		workflow,
		role,
		runState = 'idle',
		perStep,
		topOfPage,
		rightColumn,
		stepState,
		requirementState
	}: {
		checklist: WorkflowChecklistData;
		profile: Profile;
		workflow: Workflow;
		role: Role;
		runState?: ChecklistRunState;
		perStep?: StepRunState[];
		topOfPage?: Snippet;
		rightColumn: Snippet;
		stepState?: Snippet<[{ stepIndex: number; stepRunState: StepRunState }]>;
		/**
		 * Optional per-requirement renderer. When provided, the left column renders this snippet
		 * for each requirement instead of the static disabled checkbox — used by runnable pages to
		 * light requirements up with live pass/fail/warn/pending status inline.
		 */
		requirementState?: Snippet<
			[
				{
					requirement: WorkflowChecklistData['steps'][number]['requirements'][number];
					stepIndex: number;
					reqIndex: number;
				}
			]
		>;
	} = $props();

	const stepCount = $derived(checklist.steps.length);
	const stepStates = $derived<StepRunState[]>(
		perStep && perStep.length === stepCount
			? perStep
			: Array.from({ length: stepCount }, () => 'pending')
	);
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<RoleBadge {role} />
		<ProfileBadge {profile} href={profileHref(profile.slug)} />
		{#if runState === 'awaiting-wallet' || runState === 'wallet-connected'}
			<Badge class="border-live-border bg-live-soft text-live">Live · in flight</Badge>
		{:else if runState === 'complete'}
			<Badge class="border-success-border bg-success-soft text-success">Run complete</Badge>
		{:else if runState === 'error'}
			<Badge variant="destructive">Run failed</Badge>
		{/if}
	</div>
	<h1 class="text-display-lg">{workflow.name}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{workflow.blurb}</p>
</section>

{#if topOfPage}
	<section class="mt-6">
		{@render topOfPage()}
	</section>
{/if}

<section class="mt-12 grid gap-8 lg:grid-cols-5">
	<div class="space-y-10 lg:col-span-3">
		<h2 class="text-headline-md">Steps</h2>
		<ol class="space-y-10">
			{#each checklist.steps as step, i (step.title)}
				{@const state = stepStates[i] ?? 'pending'}
				<li class="space-y-3">
					<header class="flex flex-wrap items-baseline gap-3">
						<span class="text-headline-md font-mono text-primary">{i + 1}.</span>
						<h3 class="text-headline-md">{step.title}</h3>
						<StepRunStateIndicator {state} />
					</header>
					<p class="max-w-prose text-body-md text-muted-foreground">{step.summary}</p>
					{#if step.requirements.length}
						<ul class="space-y-2 pl-6">
							{#each step.requirements as req, j (req.text)}
								{#if requirementState}
									<li>
										{@render requirementState({ requirement: req, stepIndex: i, reqIndex: j })}
									</li>
								{:else}
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
											<span class="text-body-md text-foreground">{req.text}</span>
										</span>
									</li>
								{/if}
							{/each}
						</ul>
					{/if}
					{#if stepState}
						<div class="lg:hidden">
							{@render stepState({ stepIndex: i, stepRunState: state })}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</div>

	<div class="space-y-6 lg:col-span-2">
		{@render rightColumn()}
		{#if stepState}
			<ol class="hidden space-y-10 lg:block">
				{#each checklist.steps as step, i (step.title + ':aside')}
					{@const state = stepStates[i] ?? 'pending'}
					<li class="space-y-2">
						<p class="text-label-md text-muted-foreground">Step {i + 1} · {step.title}</p>
						{@render stepState({ stepIndex: i, stepRunState: state })}
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<footer class="mt-16 text-label-md text-muted-foreground">
	Source: see the
	<a class="text-primary hover:underline" href={profileHref(profile.slug)}>{profile.name}</a>
	requirements.
</footer>
