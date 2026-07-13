<script lang="ts">
	import { onMount } from 'svelte';

	import { runById } from '$lib/client/run-history/index.js';
	import { AdditiveChecklistSection } from '$lib/components/interop/additive-checklist-section/index.js';
	import { RequirementStatusRow } from '$lib/components/interop/requirement-status-row/index.js';
	import { RunHistorySummary } from '$lib/components/interop/run-history-summary/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		additiveChecklistsForCombination,
		combinationFor,
		combinedRequirements,
		liveRouteFor,
		roleBySlug,
		workflowBySlug,
		type TestRunRecord
	} from '$lib/interop/index.js';
	import type { RequirementStatus } from '$lib/interop/run-history/requirement-status.js';

	import { reopenStateFor } from './reopen-state.js';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// Defensive default for a requirement id missing from the persisted map.
	const PENDING_STATUS: RequirementStatus = { tone: 'pending', label: 'PENDING' };

	// localStorage is browser-only; hydrate after mount. `ssr = false` keeps the
	// server from ever running this, but we still guard with `mounted` so the
	// first client paint shows a loading state rather than a not-found flash.
	let record = $state<TestRunRecord | undefined>(undefined);
	let mounted = $state(false);

	onMount(() => {
		const id = page.params.id;
		record = id ? runById(id) : undefined;
		mounted = true;
	});

	const requirements = $derived(
		record ? combinedRequirements(record.role, record.workflow, record.profile) : []
	);
	const view = $derived(mounted ? reopenStateFor(record, requirements) : 'loading');

	// Derived combined checklist (base + participating additives). Only meaningful
	// when a record exists; the `render` branch guards on `combo`.
	const combo = $derived(
		record ? combinationFor(record.role, record.workflow, record.profile) : undefined
	);
	const additives = $derived(
		record
			? additiveChecklistsForCombination(record.profile, record.role, record.workflow).filter(
					({ checklist }) =>
						checklist.steps.some((s) =>
							s.requirements.some((r) => record!.statuses[r.id] !== undefined)
						)
				)
			: []
	);

	const role = $derived(record ? roleBySlug(record.role)! : undefined);
	const workflow = $derived(record ? workflowBySlug(record.workflow)! : undefined);
	const liveRoute = $derived(
		record ? liveRouteFor(record.role, record.workflow, record.profile) : resolve('/')
	);

	function rerun() {
		void goto(liveRoute);
	}

	function print() {
		window.print();
	}
</script>

{#if view === 'loading'}
	<p class="text-body-md text-muted-foreground">Loading run…</p>
{:else if view === 'not-found'}
	<section class="mx-auto max-w-prose space-y-4 py-16 text-center">
		<h1 class="text-display-sm">Run not found</h1>
		<p class="text-body-md text-muted-foreground">
			This run couldn’t be found — it may have been cleared or is from another device.
		</p>
		<div class="flex justify-center gap-3">
			<Button href={resolve('/')}>Back to the checklist</Button>
		</div>
	</section>
{:else if view === 'outdated' && record && role && workflow}
	<section class="mx-auto max-w-prose space-y-4 py-16 text-center">
		<h1 class="text-display-sm">This run is out of date</h1>
		<p class="text-body-md text-result-fail">
			The checklist changed since this run — re-run for current results.
		</p>
		<p class="text-body-md text-muted-foreground">
			{role.name} · {workflow.name}
		</p>
		<div class="flex justify-center gap-3">
			<Button onclick={rerun}>Go to the workflow</Button>
			<Button variant="outline" href={resolve('/')}>Back to the checklist</Button>
		</div>
	</section>
{:else if view === 'render' && record && combo && role && workflow}
	<div class="run-report">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			statuses={record.statuses}
		>
			{#snippet rightColumn()}
				<!-- `record`/`combo` are guaranteed by the `render` branch guard; the `!`
				     re-narrows inside these snippet closures, which don't inherit `{#if}` narrowing. -->
				<RunHistorySummary record={record!} onRerun={rerun} onPrint={print} />
			{/snippet}

			{#snippet belowSteps()}
				{#if additives.length}
					<section class="space-y-6">
						{#each additives as { additive, checklist: additiveChecklist } (additive.slug)}
							<AdditiveChecklistSection
								{additive}
								checklist={additiveChecklist}
								baseProfileName={combo!.profile.name}
								selected={true}
								onToggle={() => {}}
							>
								{#snippet requirementState({ requirement })}
									<RequirementStatusRow
										{requirement}
										status={record!.statuses[requirement.id] ?? PENDING_STATUS}
									/>
								{/snippet}
							</AdditiveChecklistSection>
						{/each}
					</section>
				{/if}
			{/snippet}
		</RunnableChecklist>
	</div>
{/if}
