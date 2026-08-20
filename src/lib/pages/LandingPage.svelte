<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import { allBadgeClaims } from '$lib/client/badges/index.js';
	import { allScenarioRuns } from '$lib/client/scenario-runs/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveProfileSelector } from '$lib/components/interop/additive-profile-selector/index.js';
	import { ChecklistRow } from '$lib/components/interop/checklist-row/index.js';
	import { CompletionGroup } from '$lib/components/interop/completion-group/index.js';
	import { ProfileSelector } from '$lib/components/interop/profile-selector/index.js';
	import { RoleSelector } from '$lib/components/interop/role-selector/index.js';
	import {
		additiveChecklistsForCombination,
		allAdditiveProfiles,
		allCombinations,
		allProfiles,
		allRoles,
		badgeHrefFor,
		badgeNameFor,
		type BadgeClaimSnapshot,
		checklistHref,
		claimedInfoFor,
		completeBadgeHrefFor,
		completeBadgeNameFor,
		completeClaimedInfoFor,
		combinationHasScenario,
		completionGroups,
		isCombinationSelected,
		profileBySlug,
		roleBySlug,
		sortCombinations,
		workflowBySlug,
		type ChecklistCombination
	} from '$lib/interop/index.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

	import { resolve } from '$app/paths';

	// Static set of rows — pure, SSR-safe.
	const combos = allCombinations();

	// Persisted scenario runs — localStorage, so browser-only. Seeded empty for
	// SSR and hydrated on mount, exactly like the selection; the meters render
	// zeroed server-side and fill in once the store is read.
	let runs = $state<Record<string, ScenarioRunRecord>>({});
	let claims = $state<BadgeClaimSnapshot[]>([]);

	onMount(() => {
		// All read localStorage — browser only.
		selectionStore.hydrate();
		runs = allScenarioRuns();
		claims = allBadgeClaims();
	});

	const selection = $derived(selectionStore.selection);
	const sortedCombos = $derived(sortCombinations(combos, selection));
	const selectedAdditives = $derived(new SvelteSet(selectionStore.additiveProfiles));

	// Plain string sets for the selected/other split: a group's profileSlug is
	// typed `ProfileSlug | AdditiveProfileSlug` (the widget is shared with the
	// additive profile page), and the homepage only ever holds base profiles, so
	// a string-keyed `.has` compares cleanly without a cast.
	const selectedProfileSlugs = $derived(new Set<string>(selection.profiles));
	const selectedRoleSlugs = $derived(new Set<string>(selection.roles));

	// Completion groups — one per (profile, role) that has scenarios. A group is
	// "yours" when both its profile and its role are selected. Blocked-ness is not
	// wired here: every current scenario is elective, so nothing is blocked; the
	// first pinned scenario (M10–M12) adds a server load to resolve it.
	const groups = $derived(completionGroups({ runs }));
	const isGroupSelected = (g: (typeof groups)[number]) =>
		selectedProfileSlugs.has(g.profileSlug) && selectedRoleSlugs.has(g.roleSlug);
	const selectedGroups = $derived(groups.filter(isGroupSelected));
	const otherGroups = $derived(groups.filter((g) => !isGroupSelected(g)));
	const hasGroupSelection = $derived(selectedGroups.length > 0);

	// The parallel surface: combinations with no scenario yet, rendered with the
	// now-statusless ChecklistRow. They count toward no meter. This section shrinks
	// as M10–M12 migrate pages and is DELETED in M13 — do not mistake it for
	// permanent architecture.
	const unmigratedCombos = $derived(sortedCombos.filter((c) => !combinationHasScenario(c)));

	/** Stable keyed-each identity for a combination row. */
	function comboKey(combo: ChecklistCombination): string {
		return `${combo.role}:${combo.workflow}:${combo.profile}`;
	}

	/** Selected additive profiles that apply to a given combination. */
	function appliedAdditivesFor(combo: ChecklistCombination) {
		return additiveChecklistsForCombination(combo.profile, combo.role, combo.workflow)
			.filter(({ additive }) => selectedAdditives.has(additive.slug))
			.map(({ additive }) => ({ slug: additive.slug, name: additive.name }));
	}
</script>

<section class="space-y-4">
	<!-- `text-display-lg` alone overflows at 375px; scale it up from `text-headline-md`. -->
	<h1 class="text-headline-md sm:text-display-lg">LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Your console for building and evaluating interoperable Learning &amp; Employment Record systems.
		Pick the roles and profiles you care about, and the completion groups below reorganize into your
		working set — each one a badge's worth of scenarios for one role, with a meter that fills as you
		run them.
	</p>
</section>

<section class="mt-4">
	<p class="text-body-sm max-w-prose text-muted-foreground">
		Standards compliance isn’t the same as interoperability.
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
			href={checklistHref(combo.role, combo.workflow, combo.profile)}
			appliedAdditives={appliedAdditivesFor(combo)}
		/>
	{/if}
{/snippet}

<section class="mt-16 space-y-8">
	<header class="space-y-2">
		<h2 class="text-headline-md">Your scenarios</h2>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Each group tracks one profile's badge for one role — a meter that counts
			<em>requirements</em>, so it adds up from its own rows and fills exactly when the badge
			becomes claimable. Open a scenario to run it.
		</p>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Assessment results are private to the organization or user completing the test and are not
			visible to other vendors or external users unless intentionally shared.
		</p>
	</header>

	{#snippet groupCard(group: (typeof groups)[number])}
		<CompletionGroup
			profileName={group.profileName}
			roleName={group.roleName}
			result={group.result}
			{runs}
			claimHref={badgeHrefFor(group.profileSlug, group.roleSlug)}
			claim={claimedInfoFor(group.profileSlug, group.roleSlug, claims)}
			baseBadgeName={badgeNameFor(group.profileSlug, group.roleSlug)}
			expandedClaimHref={completeBadgeHrefFor(group.profileSlug, group.roleSlug)}
			expandedClaim={completeClaimedInfoFor(group.profileSlug, group.roleSlug, claims)}
			completeBadgeName={completeBadgeNameFor(group.profileSlug, group.roleSlug)}
		/>
	{/snippet}

	{#if hasGroupSelection}
		<div class="space-y-4">
			{#each selectedGroups as group (group.profileSlug + ':' + group.roleSlug)}
				{@render groupCard(group)}
			{/each}
		</div>
	{/if}

	{#if otherGroups.length > 0}
		<details class="group space-y-4" open={!hasGroupSelection}>
			<summary class="cursor-pointer list-none space-y-1">
				<span class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="text-muted-foreground transition-transform group-open:rotate-90"
					>
						›
					</span>
					<span class="text-title-lg text-foreground">
						{hasGroupSelection ? 'Other scenario sets' : 'All scenario sets'}
					</span>
				</span>
				<p class="max-w-prose pl-6 text-body-md text-muted-foreground">
					Completion sets outside your current selection. Change your role and profile selections
					above to bring one into your working set.
				</p>
			</summary>
			<div class="mt-4 space-y-4">
				{#each otherGroups as group (group.profileSlug + ':' + group.roleSlug)}
					{@render groupCard(group)}
				{/each}
			</div>
		</details>
	{/if}

	{#if unmigratedCombos.length > 0}
		<!--
			The "Not yet migrated" section — the honest handling of the parallel
			surface. These (role, workflow, profile) combinations have no scenario
			yet; they use the now-statusless ChecklistRow and count toward NO meter.
			This section shrinks as M10–M12 land and is DELETED in M13. It is not
			permanent architecture.
		-->
		<details class="group space-y-3">
			<summary class="cursor-pointer list-none space-y-1">
				<span class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="text-muted-foreground transition-transform group-open:rotate-90"
					>
						›
					</span>
					<span class="text-title-lg text-foreground">Not yet migrated</span>
				</span>
				<p class="max-w-prose pl-6 text-body-md text-muted-foreground">
					These checklists are still being converted into scenarios. They do not count toward any
					meter yet — open one to review its requirements and run its test.
				</p>
			</summary>
			<div class="mt-3 space-y-2">
				{#each unmigratedCombos as combo (comboKey(combo))}
					{@render checklistRow(combo)}
				{/each}
			</div>
		</details>
	{/if}
</section>
