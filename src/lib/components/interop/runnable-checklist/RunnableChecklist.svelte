<script lang="ts">
	import type { Snippet } from 'svelte';

	import { InlineMarkup } from '$lib/components/interop/inline-markup/index.js';
	import { ProfileBadge } from '$lib/components/interop/profile-badge/index.js';
	import {
		RequirementStatusRow,
		stepStateToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import { RunStatusIndicator } from '$lib/components/interop/run-status-indicator/index.js';
	import {
		profileHref,
		type Profile,
		type Role,
		type StepRunState,
		type Workflow,
		type WorkflowChecklist as WorkflowChecklistData
	} from '$lib/interop/index.js';
	import type { RequirementStatus } from '$lib/interop/run-history/requirement-status.js';

	let {
		checklist,
		profile,
		workflow,
		role,
		topOfPage,
		headerBadge,
		rightColumn,
		belowSteps,
		statuses
	}: {
		checklist: WorkflowChecklistData;
		profile: Profile;
		workflow: Workflow;
		role: Role;
		topOfPage?: Snippet;
		/**
		 * Optional live badge rendered in the header row, alongside the role/profile badges. The
		 * page owns it (driven by its own transient `runState`, which is not derivable from the
		 * persisted `statuses` map) — see `RunStateBadge`.
		 */
		headerBadge?: Snippet;
		rightColumn: Snippet;
		/**
		 * Rendered inside the left checklist column, below the steps — used for additive sections
		 * so they align to the requirements width instead of spanning the full page width.
		 */
		belowSteps?: Snippet;
		/**
		 * Display-only per-requirement statuses keyed by requirement id. The left column renders each
		 * requirement's row from `statuses[requirement.id]` via `RequirementStatusRow`, and each step
		 * header's indicator is aggregated from its requirements' statuses. A requirement whose id is
		 * missing from the map renders as `pending` (defensive default).
		 */
		statuses?: Record<string, RequirementStatus>;
	} = $props();

	/** Defensive default for a requirement id missing from the `statuses` map. */
	const PENDING_STATUS: RequirementStatus = { tone: 'pending', label: 'PENDING' };

	/**
	 * Aggregate a step's per-requirement statuses into a single step-header run state (reusing the
	 * shared `stepStateToRequirementStatus` mapping for the indicator). A `fail` in any requirement
	 * fails the step; an `in-flight` keeps it in progress; any unresolved requirement leaves it
	 * pending; a wholly-skipped step reads as skipped; otherwise the step is complete.
	 */
	function stepRunStateFor(step: WorkflowChecklistData['steps'][number]): StepRunState {
		if (step.requirements.length === 0) return 'pending';
		const tones = step.requirements.map((r) => (statuses?.[r.id] ?? PENDING_STATUS).tone);
		if (tones.some((t) => t === 'fail')) return 'failed';
		if (tones.some((t) => t === 'in-flight')) return 'in-flight';
		if (tones.some((t) => t === 'pending')) return 'pending';
		if (tones.every((t) => t === 'skipped')) return 'skipped';
		return 'complete';
	}
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<RoleBadge {role} />
		<ProfileBadge {profile} href={profileHref(profile.slug)} />
		{#if headerBadge}
			{@render headerBadge()}
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
				<li class="space-y-3">
					<header class="flex flex-wrap items-baseline gap-3">
						<span class="text-headline-md font-mono text-primary">{i + 1}.</span>
						<h3 class="text-headline-md">{step.title}</h3>
						<RunStatusIndicator status={stepStateToRequirementStatus(stepRunStateFor(step))} />
					</header>
					<InlineMarkup
						text={step.summary}
						class="block max-w-prose text-body-md text-muted-foreground"
					/>
					{#if step.requirements.length}
						<ul class="space-y-2 pl-6">
							{#each step.requirements as req (req.text)}
								<li>
									<RequirementStatusRow
										requirement={req}
										status={statuses?.[req.id] ?? PENDING_STATUS}
									/>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ol>
		{#if belowSteps}
			{@render belowSteps()}
		{/if}
	</div>

	<div class="space-y-6 lg:col-span-2">
		{@render rightColumn()}
	</div>
</section>

<footer class="mt-16 text-label-md text-muted-foreground">
	Source: see the
	<a class="text-primary hover:underline" href={profileHref(profile.slug)}>{profile.name}</a>
	requirements.
</footer>
