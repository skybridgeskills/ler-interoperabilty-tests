<script lang="ts">
	import { onMount } from 'svelte';

	import { allBadgeClaims } from '$lib/client/badges/index.js';
	import { perspectiveStore } from '$lib/client/perspective/index.js';
	import { allScenarioRuns } from '$lib/client/scenario-runs/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { ExternalLink } from '$lib/components/external-link/index.js';
	import { BuiltOn } from '$lib/components/interop/built-on/index.js';
	import { CompletionGroup } from '$lib/components/interop/completion-group/index.js';
	import { ProfileSummary } from '$lib/components/interop/profile-summary/index.js';
	import { PageHero } from '$lib/components/page-hero/index.js';
	import {
		badgeHrefFor,
		badgeNameFor,
		type BadgeClaimSnapshot,
		claimedInfoFor,
		expandedBadgeHrefFor,
		expandedBadgeNameFor,
		expandedClaimedInfoFor,
		addOnBadgeHrefFor,
		addOnBadgeNameFor,
		addOnClaimedInfoFor,
		completionGroupsForProfile,
		profileBySlug,
		profileHref
	} from '$lib/interop/index.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

	import { resolve } from '$app/paths';

	let { data } = $props();

	const perspective = perspectiveStore();

	// Runs and selection are localStorage-backed, so browser-only: the page renders
	// a zeroed meter server-side and fills it in on mount. Selection only orders
	// the groups (selected roles first), so its absence during SSR is harmless.
	//
	// `data.blocked` is the exception, and the reason this route is no longer
	// prerendered: which cryptosuites this deployment's tenants can issue is server
	// knowledge, resolved in `+page.server.ts` before anything renders.
	let runs = $state<Record<string, ScenarioRunRecord>>({});
	let claims = $state<BadgeClaimSnapshot[]>([]);

	onMount(() => {
		selectionStore.hydrate();
		runs = allScenarioRuns();
		claims = allBadgeClaims();
	});

	// Completion groups scoped to THIS profile — one per role that has scenarios.
	// For an additive profile the same call resolves its memberships, giving the
	// additive's own sub-meter promoted to a page. Selected roles sort first.
	const scenarioGroups = $derived.by(() => {
		// For a BASE profile this is one card per role, with the reader's selected
		// add-ons as slices inside. For an ADDITIVE profile it is one card per
		// (base profile, role) — the triple an add-on badge is keyed to since M15 —
		// and `additives` is ignored, because nesting slices inside an additive's own
		// page would list the same scenarios twice.
		const groups = completionGroupsForProfile({
			profileSlug: data.profile.slug,
			profileName: data.profile.name,
			runs,
			blocked: data.blocked,
			additives: [...selectionStore.additiveProfiles]
		});
		const selectedRoles = new Set<string>(selectionStore.roles);
		return [...groups].sort(
			(a, b) => Number(selectedRoles.has(b.roleSlug)) - Number(selectedRoles.has(a.roleSlug))
		);
	});

	const compatibleBaseProfiles = $derived(
		data.kind === 'additive'
			? data.profile.appliesToBaseProfiles
					.map((slug) => profileBySlug(slug))
					.filter(<T,>(p: T | undefined): p is T => p !== undefined)
			: []
	);
</script>

<!--
	One bundle card.

	`group.addOn` is set when the card IS an additive's slice — the shape this page
	renders for an additive profile, one card per (base profile, role). Its claim
	control is then the ADD-ON badge for that triple, never the base profile's
	Essential badge, and it has no Expanded tier: "a complete slice of an additive"
	is not a thing anyone can claim.

	For a base profile the card is two-tier, and the Expanded accessors return
	undefined where that profile-role has no optional set.
-->
{#snippet groupCard(group: (typeof scenarioGroups)[number])}
	{#if group.addOn}
		<CompletionGroup
			profileName={group.profileName}
			roleName={group.roleName}
			result={group.result}
			additives={[]}
			{runs}
			claimHref={addOnBadgeHrefFor(group.addOn.slug, group.profileSlug, group.roleSlug)}
			claim={addOnClaimedInfoFor(group.addOn.slug, group.profileSlug, group.roleSlug, claims)}
			baseBadgeName={addOnBadgeNameFor(group.addOn.slug, group.profileSlug, group.roleSlug)}
		/>
	{:else}
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
	{/if}
{/snippet}

<PageHero perspective={perspective.current} onPerspectiveChange={(p) => perspective.choose(p)}>
	{#snippet breadcrumb()}
		<a href={resolve('/')} class="text-primary hover:underline">Home</a>
		<span aria-hidden="true">›</span>
		<a href={resolve('/profiles')} class="text-primary hover:underline">Standard Profiles</a>
	{/snippet}
	{#snippet eyebrow()}{data.kind === 'additive' ? 'Add-on' : 'Standard Profile'}{/snippet}
	{#snippet title()}
		{data.kind === 'additive' ? data.profile.name : `${data.profile.name} Standard Profile`}
	{/snippet}
	{#snippet lede()}{data.profile.description}{/snippet}
	{#snippet meta()}
		<!-- One item per fact, so the line wraps between them, never inside a date. -->
		<span class="whitespace-nowrap">v{data.profile.version} · {data.profile.status}</span>
		{#if data.kind === 'base'}
			<span class="whitespace-nowrap">Updated {data.profile.lastUpdated}</span>
		{/if}
		{#if data.profile.url}
			<ExternalLink href={data.profile.url} title={`${data.profile.name} · ${data.profile.status}`}>
				{data.kind === 'additive' ? 'Read the published add-on' : 'Read the published profile'}
			</ExternalLink>
		{/if}
	{/snippet}
</PageHero>

{#if data.kind === 'base'}
	<ProfileSummary profile={data.profile} />

	<section class="mt-12 max-w-2xl space-y-4">
		<h2 class="text-headline-md">Scenarios</h2>
		{#if scenarioGroups.length > 0}
			<div class="space-y-4">
				{#each scenarioGroups as group (group.profileSlug + ':' + group.roleSlug)}
					{@render groupCard(group)}
				{/each}
			</div>
		{:else}
			<p class="text-body-md text-muted-foreground">
				No scenarios are registered for this Standard Profile yet. Every Standard Profile the suite
				ships has them — this state is reachable only for one added without a catalog entry.
			</p>
		{/if}
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
	{#if data.profile.standards}
		<div class="mt-8 max-w-2xl">
			<BuiltOn standards={data.profile.standards} />
		</div>
	{/if}

	<section class="mt-12 max-w-2xl space-y-4">
		<h2 class="text-headline-md">Scenarios</h2>
		{#if scenarioGroups.length > 0}
			<div class="space-y-4">
				{#each scenarioGroups as group (group.profileSlug + ':' + group.roleSlug)}
					{@render groupCard(group)}
				{/each}
			</div>
		{:else}
			<p class="text-body-md text-muted-foreground">
				No scenarios name this add-on yet. When they do, this is where its own requirement meter
				appears.
			</p>
		{/if}
	</section>

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
{/if}
