<script lang="ts">
	import AppWindow from '@lucide/svelte/icons/app-window';
	import Layers from '@lucide/svelte/icons/layers';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import { allBadgeClaims } from '$lib/client/badges/index.js';
	import { perspectiveStore } from '$lib/client/perspective/index.js';
	import {
		allScenarioRuns,
		exportResults,
		importResults
	} from '$lib/client/scenario-runs/index.js';
	import {
		filterIntroDone,
		markFilterIntroDone,
		selectionStore
	} from '$lib/client/selection/index.js';
	import { CompletionGroup } from '$lib/components/interop/completion-group/index.js';
	import { FilterBar } from '$lib/components/interop/filter-bar/index.js';
	import { ResultsTransfer } from '$lib/components/interop/results-transfer/index.js';
	import { PageHero } from '$lib/components/page-hero/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		badgeHrefFor,
		badgeNameFor,
		type BadgeClaimSnapshot,
		claimedInfoFor,
		expandedBadgeHrefFor,
		expandedBadgeNameFor,
		expandedClaimedInfoFor,
		completionGroups,
		profileBySlug,
		roleBySlug
	} from '$lib/interop/index.js';
	import { PerspectiveCopy, perspectiveCopy } from '$lib/interop/perspective/index.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
	import type { CannotServe } from '$lib/interop/scenarios/index.js';
	import {
		emptyStateCopy,
		fromSearchParams,
		hasSelectionParams
	} from '$lib/interop/selection/index.js';

	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/**
	 * Which scenarios this deployment cannot serve, keyed by slug — resolved by the
	 * route's server load, never read from config here.
	 *
	 * Defaulted to `{}` so Storybook and the component's own specs can render the
	 * page without a server: a deployment that pins nothing blocks nothing, which
	 * is the honest default rather than a convenience.
	 */
	let { blocked = {} }: { blocked?: Record<string, CannotServe> } = $props();

	const perspective = perspectiveStore();

	/**
	 * The only hero copy that varies by Perspective. Placeholder until the
	 * Perspective copy is authored: all three versions read the same.
	 */
	const HOME_LEDE = PerspectiveCopy({
		builder:
			'Your console for building and evaluating interoperable Learning & Employment Record systems. Standards compliance isn’t the same as interoperability.',
		evaluator:
			'Your console for building and evaluating interoperable Learning & Employment Record systems. Standards compliance isn’t the same as interoperability.',
		neutral:
			'Your console for building and evaluating interoperable Learning & Employment Record systems. Standards compliance isn’t the same as interoperability.'
	});

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

	/**
	 * The inline first step. Opened **after hydration only** — the selection
	 * lives in localStorage, so the server cannot know it is empty, and a
	 * returning reader with a saved filter must never see the step flash.
	 */
	let showIntro = $state(false);

	function endIntro() {
		showIntro = false;
		markFilterIntroDone();
	}

	onMount(() => {
		// All read browser storage — browser only.
		selectionStore.hydrate();
		// A shared link (`/?roles=…&profiles=…&addons=…`) overwrites the saved
		// selection, then leaves the address bar: the link seeds, it does not stick.
		const shared = fromSearchParams(page.url.searchParams);
		if (shared) selectionStore.replace(shared);
		reloadResults();
		const empty =
			selectionStore.roles.length === 0 &&
			selectionStore.profiles.length === 0 &&
			selectionStore.additiveProfiles.length === 0;
		showIntro = empty && !filterIntroDone();
	});

	// The strip waits for the router: on the first load, `afterNavigate` runs while
	// SvelteKit is still initialising, and `replaceState` refuses until it is done.
	afterNavigate(() => {
		if (!hasSelectionParams(page.url.searchParams)) return;
		setTimeout(() => replaceState(resolve('/'), {}));
	});

	function clearSelection() {
		selectionStore.clear();
		// Clearing within a session does not bring the first step back.
		markFilterIntroDone();
	}

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

<div class="pb-6">
	<PageHero
		size="large"
		perspective={perspective.current}
		onPerspectiveChange={(p) => perspective.choose(p)}
	>
		{#snippet title()}LER Interoperability Test Suite{/snippet}
		{#snippet lede()}{perspectiveCopy(HOME_LEDE, perspective.current)}{/snippet}
		{#snippet actions()}
			<Button
				href={resolve('/about')}
				variant="perspective"
				class="h-9 rounded-full px-[18px] text-body-md">About these tests</Button
			>
		{/snippet}
	</PageHero>
</div>

<FilterBar
	roles={selection.roles}
	profiles={selection.profiles}
	additives={selectedAdditives}
	onToggleRole={selectionStore.toggleRole}
	onToggleProfile={selectionStore.toggleProfile}
	onToggleAdditive={selectionStore.toggleAdditiveProfile}
	onClear={clearSelection}
	matched={shownGroups.length}
	hidden={hiddenGroups.length}
	perspective={perspective.current}
	intro={showIntro}
	onIntroEnd={endIntro}
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
		expandedClaimHref={expandedBadgeHrefFor(group.profileSlug, group.roleSlug)}
		expandedClaim={expandedClaimedInfoFor(group.profileSlug, group.roleSlug, claims)}
		expandedBadgeName={expandedBadgeNameFor(group.profileSlug, group.roleSlug)}
	/>
{/snippet}

<section class="mt-8 space-y-6">
	<h2 class="sr-only">Scenario sets</h2>

	{#if shownGroups.length === 0}
		<!--
			Guided recovery, generated from the catalog: only a role × Standard Profile
			gap can empty the list, so it names the gap, what each selected profile
			does cover, and offers to remove each choice.
		-->
		{@const copy = emptyStateCopy({
			roles: [...selection.roles],
			profiles: [...selection.profiles]
		})}
		<div class="rounded-lg border border-dashed border-border p-6 text-center sm:p-8">
			<p class="text-body-md text-foreground">{copy.headline}</p>
			{#each copy.coverage as line (line)}
				<p class="mt-1 text-body-md text-muted-foreground">{line}</p>
			{/each}
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				{#each [...selection.profiles] as slug (slug)}
					<button
						type="button"
						onclick={() => selectionStore.toggleProfile(slug)}
						class="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-body-md text-foreground transition-colors hover:border-foreground"
					>
						<Layers class="size-3.5" aria-hidden="true" />
						Remove {profileBySlug(slug)?.name ?? slug}
					</button>
				{/each}
				{#each [...selection.roles] as slug (slug)}
					<button
						type="button"
						onclick={() => selectionStore.toggleRole(slug)}
						class="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-body-md text-foreground transition-colors hover:border-foreground"
					>
						<AppWindow class="size-3.5" aria-hidden="true" />
						Remove {roleBySlug(slug)?.plural ?? slug}
					</button>
				{/each}
			</div>
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
