<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import { allBadgeClaims } from '$lib/client/badges/index.js';
	import {
		allScenarioRuns,
		exportResults,
		importResults
	} from '$lib/client/scenario-runs/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { CompletionGroup } from '$lib/components/interop/completion-group/index.js';
	import { FilterBar } from '$lib/components/interop/filter-bar/index.js';
	import { ResultsTransfer } from '$lib/components/interop/results-transfer/index.js';
	import {
		badgeHrefFor,
		badgeNameFor,
		type BadgeClaimSnapshot,
		claimedInfoFor,
		completeBadgeHrefFor,
		completeBadgeNameFor,
		completeClaimedInfoFor,
		completionGroups
	} from '$lib/interop/index.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
	import type { CannotServe } from '$lib/interop/scenarios/index.js';

	import { resolve } from '$app/paths';

	/**
	 * Which scenarios this deployment cannot serve, keyed by slug — resolved by the
	 * route's server load, never read from config here.
	 *
	 * Defaulted to `{}` so Storybook and the component's own specs can render the
	 * page without a server: a deployment that pins nothing blocks nothing, which
	 * is the honest default rather than a convenience.
	 */
	let { blocked = {} }: { blocked?: Record<string, CannotServe> } = $props();

	// Persisted scenario runs — localStorage, so browser-only. Seeded empty for
	// SSR and hydrated on mount, exactly like the selection; the meters render
	// zeroed server-side and fill in once the store is read.
	let runs = $state<Record<string, ScenarioRunRecord>>({});
	let claims = $state<BadgeClaimSnapshot[]>([]);

	/** Re-read the persisted stores — on mount, and again after an import. */
	function reloadResults() {
		runs = allScenarioRuns();
		claims = allBadgeClaims();
	}

	onMount(() => {
		// All read localStorage — browser only.
		selectionStore.hydrate();
		reloadResults();
	});

	const selection = $derived(selectionStore.selection);
	const selectedAdditives = $derived(new SvelteSet(selectionStore.additiveProfiles));

	// Completion groups — one per (profile, role) that has scenarios. A blocked
	// scenario renders as a disabled row and keeps its requirements in the
	// denominator; `evaluateCompletion` owns that arithmetic and this page only
	// forwards what the server resolved.
	const groups = $derived(
		completionGroups({ runs, blocked, additives: [...selectionStore.additiveProfiles] })
	);

	/**
	 * The filter **filters**: a group matches when every dimension the reader has
	 * narrowed still admits it, and an untouched dimension admits everything.
	 *
	 * This replaces the old selected/"other" split, which reordered rather than
	 * filtered and therefore rendered an empty "your scenarios" section whenever a
	 * selection happened to match nothing — the single most misleading thing the
	 * page did.
	 */
	// String-keyed sets for the match test: a group's `profileSlug` is typed
	// `ProfileSlug | AdditiveProfileSlug` (the widget is shared with the additive
	// profile page) while the homepage selection only ever holds base profiles, so
	// a string-keyed `.has` compares cleanly without a cast.
	const selectedRoleSlugs = $derived(new SvelteSet<string>(selection.roles));
	const selectedProfileSlugs = $derived(new SvelteSet<string>(selection.profiles));

	const matchesFilter = (group: (typeof groups)[number]) =>
		(selectedRoleSlugs.size === 0 || selectedRoleSlugs.has(group.roleSlug)) &&
		(selectedProfileSlugs.size === 0 || selectedProfileSlugs.has(group.profileSlug));

	const shownGroups = $derived(groups.filter(matchesFilter));
	const hiddenGroups = $derived(groups.filter((g) => !matchesFilter(g)));
	let showHidden = $state(false);
</script>

<section class="space-y-3 pb-6">
	<!-- `text-display-lg` alone overflows at 375px; scale it up from `text-headline-md`. -->
	<h1 class="text-headline-md sm:text-display-lg">LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Your console for building and evaluating interoperable Learning &amp; Employment Record systems.
		Standards compliance isn’t the same as interoperability —
		<a href={resolve('/about')} class="text-primary hover:underline">
			read about what this tool does →
		</a>
	</p>
</section>

<FilterBar
	roles={selection.roles}
	profiles={selection.profiles}
	additives={selectedAdditives}
	onToggleRole={selectionStore.toggleRole}
	onToggleProfile={selectionStore.toggleProfile}
	onToggleAdditive={selectionStore.toggleAdditiveProfile}
	onClear={selectionStore.clear}
	matched={shownGroups.length}
	hidden={hiddenGroups.length}
/>

{#snippet groupCard(group: (typeof groups)[number])}
	<CompletionGroup
		profileName={group.profileName}
		roleName={group.roleName}
		result={group.result}
		additives={group.additives}
		{runs}
		claimHref={badgeHrefFor(group.profileSlug, group.roleSlug)}
		claim={claimedInfoFor(group.profileSlug, group.roleSlug, claims)}
		baseBadgeName={badgeNameFor(group.profileSlug, group.roleSlug)}
		expandedClaimHref={completeBadgeHrefFor(group.profileSlug, group.roleSlug)}
		expandedClaim={completeClaimedInfoFor(group.profileSlug, group.roleSlug, claims)}
		completeBadgeName={completeBadgeNameFor(group.profileSlug, group.roleSlug)}
	/>
{/snippet}

<section class="mt-8 space-y-6">
	<h2 class="sr-only">Scenario sets</h2>

	{#if shownGroups.length === 0}
		<div class="rounded-lg border border-dashed border-border p-8 text-center">
			<p class="text-body-md text-foreground">No scenario set matches that combination yet.</p>
			<p class="mt-1 text-body-md text-muted-foreground">
				Every scenario set is still available — clear a filter to see them.
			</p>
		</div>
	{/if}

	<div class="space-y-4">
		{#each shownGroups as group (group.profileSlug + ':' + group.roleSlug)}
			{@render groupCard(group)}
		{/each}
	</div>

	{#if hiddenGroups.length > 0}
		<!--
			The escape hatch. A filter that can only ever remove things strands a
			reader who filtered too hard, so what is held back is always one click
			away and says how much it is holding.
		-->
		<div class="space-y-4">
			<button
				type="button"
				onclick={() => (showHidden = !showHidden)}
				class="text-label-md text-primary hover:underline"
			>
				{showHidden
					? 'Hide the sets outside your filter'
					: `Show ${hiddenGroups.length} scenario set${hiddenGroups.length === 1 ? '' : 's'} outside your filter`}
			</button>
			{#if showHidden}
				<div class="space-y-4 opacity-75">
					{#each hiddenGroups as group (group.profileSlug + ':' + group.roleSlug)}
						{@render groupCard(group)}
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<p class="max-w-prose text-body-md text-muted-foreground">
		Assessment results are private to the organization or user completing the test and are not
		visible to other vendors or external users unless intentionally shared.
	</p>

	<ResultsTransfer onExport={exportResults} onImport={importResults} onImported={reloadResults} />
</section>
