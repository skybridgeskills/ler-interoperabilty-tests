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
		Your console for building and buying interoperable Learning &amp; Employment Record systems.
		Pick the roles and profiles you care about, and the workflow checklists below reorganize into
		your working set — each one drillable into the exact ordered steps your profile requires, with
		the result of your most recent test run.
	</p>
</section>

<section class="mt-12">
	<RoleSelector
		roles={allRoles}
		selected={selection.roles}
		onToggle={selectionStore.toggleRole}
		description="Choose the role(s) you build or evaluate. Wallets play the holder role; the label stays “Wallet.”"
		builderNote="Pick the role(s) your product plays — issuer, wallet, and/or verifier."
		buyerNote="Pick the role you're evaluating a vendor for, then ask them to prove the matching checklists."
	/>
</section>

<section class="mt-12">
	<ProfileSelector
		profiles={allProfiles}
		selected={selection.profiles}
		onToggle={selectionStore.toggleProfile}
		builderNote="Cover the profiles your product needs to interoperate with."
		buyerNote="Pick the profiles your ecosystem requires, then ask vendors to demonstrate them."
	/>
</section>

<section class="mt-12">
	<AdditiveProfileSelector
		profiles={allAdditiveProfiles}
		selected={selectedAdditives}
		onToggle={selectionStore.toggleAdditiveProfile}
	/>
</section>

<section class="mt-16 space-y-4">
	<header class="space-y-2">
		<h2 class="text-headline-md">Workflows</h2>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Every (role, workflow, profile) checklist, as a working list. Selecting roles and profiles
			above floats your relevant checklists to the top and highlights them; the rest stay available
			but de-emphasized. Each row opens the full checklist and shows your latest run result.
		</p>
	</header>

	<div class="space-y-2">
		{#each sortedCombos as combo (runCombinationKey(combo.role, combo.workflow, combo.profile))}
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
		{/each}
	</div>
</section>
