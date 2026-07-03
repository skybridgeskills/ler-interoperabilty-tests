<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import { allLatestRuns, runCombinationKey } from '$lib/client/run-history/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveProfileSelector } from '$lib/components/interop/additive-profile-selector/index.js';
	import { ChecklistRow } from '$lib/components/interop/checklist-row/index.js';
	import { ProfileSelector } from '$lib/components/interop/profile-selector/index.js';
	import { RoleSelector } from '$lib/components/interop/role-selector/index.js';
	import {
		additiveChecklistsForCombination,
		allAdditiveProfiles,
		allCombinations,
		allProfiles,
		allRoles,
		checklistHref,
		isCombinationSelected,
		profileBySlug,
		roleBySlug,
		sortCombinations,
		workflowBySlug,
		type ChecklistCombination,
		type TestRunRecord
	} from '$lib/interop/index.js';

	import { resolve } from '$app/paths';

	// Static set of rows — pure, SSR-safe.
	const combos = allCombinations();

	// Run history is browser-only; hydrate after mount to avoid SSR/localStorage.
	let latestRuns = $state<Map<string, TestRunRecord>>(new Map());

	onMount(() => {
		// Both stores read localStorage — browser only.
		selectionStore.hydrate();
		latestRuns = allLatestRuns();
	});

	const selection = $derived(selectionStore.selection);
	const sortedCombos = $derived(sortCombinations(combos, selection));
	const selectedCombos = $derived(sortedCombos.filter((c) => isCombinationSelected(c, selection)));
	const otherCombos = $derived(sortedCombos.filter((c) => !isCombinationSelected(c, selection)));
	const hasSelection = $derived(selectedCombos.length > 0);
	const selectedAdditives = $derived(new SvelteSet(selectionStore.additiveProfiles));

	/** Selected additive profiles that apply to a given combination. */
	function appliedAdditivesFor(combo: ChecklistCombination) {
		return additiveChecklistsForCombination(combo.profile, combo.role, combo.workflow)
			.filter(({ additive }) => selectedAdditives.has(additive.slug))
			.map(({ additive }) => ({ slug: additive.slug, name: additive.name }));
	}
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Your console for building and evaluating interoperable Learning &amp; Employment Record systems.
		Pick the roles and profiles you care about, and the workflow checklists below reorganize into
		your working set — each one drillable into the exact ordered steps your profile requires, with
		the result of your most recent test run.
	</p>
</section>

<section class="mt-4">
	<p class="text-body-sm max-w-prose text-muted-foreground">
		New here? Standards compliance isn’t the same as interoperability.
		<a href={resolve('/about')} class="text-primary hover:underline">
			Read about what this tool does →
		</a>
	</p>
</section>

<section class="mt-12">
	<RoleSelector
		roles={allRoles}
		selected={selection.roles}
		onToggle={selectionStore.toggleRole}
		description="Choose the role(s) you build or evaluate. Wallets play the holder role; the label stays “Wallet.”"
		builderNote="Pick the role(s) your product plays: issuer, wallet, verifier, or some combination."
		evaluatorNote="Pick the role(s) you need a platform, vendor, or implementation to demonstrate."
	/>
</section>

<section class="mt-12">
	<ProfileSelector
		profiles={allProfiles}
		selected={selection.profiles}
		onToggle={selectionStore.toggleProfile}
		builderNote="Cover the profiles your product needs to interoperate with."
		evaluatorNote="Pick the profiles your ecosystem requires, then ask the platform or implementation to demonstrate them."
	/>
</section>

<section class="mt-12">
	<AdditiveProfileSelector
		profiles={allAdditiveProfiles}
		selected={selectedAdditives}
		onToggle={selectionStore.toggleAdditiveProfile}
	/>
</section>

{#snippet checklistRow(combo: ChecklistCombination)}
	{@const role = roleBySlug(combo.role)}
	{@const workflow = workflowBySlug(combo.workflow)}
	{@const profile = profileBySlug(combo.profile)}
	{#if role && workflow && profile}
		<ChecklistRow
			combination={{ role, workflow, profile }}
			selected={isCombinationSelected(combo, selection)}
			latestRun={latestRuns.get(runCombinationKey(combo.role, combo.workflow, combo.profile))}
			href={checklistHref(combo.role, combo.workflow, combo.profile)}
			appliedAdditives={appliedAdditivesFor(combo)}
		/>
	{/if}
{/snippet}

<section class="mt-16 space-y-6">
	<header class="space-y-2">
		<h2 class="text-headline-md">Workflows</h2>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Each row opens the full checklist — the exact ordered steps your profile requires — and shows
			your latest run result.
		</p>
		<p class="text-body-sm max-w-prose text-muted-foreground">
			Assessment results are private to the organization or user completing the test and are not
			visible to other vendors or external users unless intentionally shared.
		</p>
	</header>

	{#if hasSelection}
		<div class="space-y-3">
			<header class="space-y-1">
				<h3 class="text-title-lg text-foreground">Selected workflow checklists</h3>
				<p class="max-w-prose text-body-md text-muted-foreground">
					These checklists match the roles and profiles you selected above. Open each checklist to
					review requirements and run the corresponding test.
				</p>
			</header>
			<div class="space-y-2">
				{#each selectedCombos as combo (runCombinationKey(combo.role, combo.workflow, combo.profile))}
					{@render checklistRow(combo)}
				{/each}
			</div>
		</div>
	{/if}

	{#if otherCombos.length > 0}
		<details class="group space-y-3" open={!hasSelection}>
			<summary class="cursor-pointer list-none space-y-1">
				<span class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="text-muted-foreground transition-transform group-open:rotate-90"
					>
						›
					</span>
					<span class="text-title-lg text-foreground"
						>{hasSelection ? 'Other available checklists' : 'Available checklists'}</span
					>
				</span>
				<p class="max-w-prose pl-6 text-body-md text-muted-foreground">
					These checklists are not part of your current selection. Expand this section to view
					additional workflows, or change your role/profile selections above.
				</p>
			</summary>
			<div class="mt-3 space-y-2">
				{#each otherCombos as combo (runCombinationKey(combo.role, combo.workflow, combo.profile))}
					{@render checklistRow(combo)}
				{/each}
			</div>
		</details>
	{/if}
</section>
