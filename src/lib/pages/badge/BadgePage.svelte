<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { latestClaimFor, recordBadgeClaim } from '$lib/client/badges/index.js';
	import { perspectiveStore } from '$lib/client/perspective/index.js';
	import { allScenarioRuns } from '$lib/client/scenario-runs/index.js';
	import { ExchangeRunnerPanel } from '$lib/components/interop/exchange-runner/index.js';
	import type { ExchangeRunnerPanelData } from '$lib/components/interop/exchange-runner/index.js';
	import { PageHero } from '$lib/components/page-hero/index.js';
	import { ContextChip } from '$lib/components/perspective/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { additiveProfileBySlug, profileBySlug, roleBySlug } from '$lib/interop/accessors.js';
	import {
		type BadgeClaimSnapshot,
		type BadgeDefinition,
		badgeKey,
		claimSnapshot,
		formatDay,
		newSince,
		requirementIdsBehindBadge,
		scenariosBehindBadge
	} from '$lib/interop/badges/index.js';
	import {
		type CompletionResult,
		evaluateCompletion,
		completeTotals,
		isClaimable,
		isExpandedClaimable
	} from '$lib/interop/completion/index.js';
	import { additiveProfileHref, profileHref, roleHref } from '$lib/interop/route-hrefs.js';
	import type { CannotServe } from '$lib/interop/scenarios/index.js';

	import { type ClaimError, type ClaimLink, startBadgeClaim } from './badge-claim.js';

	import { resolve } from '$app/paths';

	/**
	 * `/badges/[slug]`, serving three audiences from **one** page:
	 *
	 * 1. **Stranger / criteria** — the badge's name, criteria and ids, rendered
	 *    server-side from the definition alone. No completion, no claim control.
	 * 2. **`?v=` mismatch** — a plain warning atop the criteria page; it does not
	 *    claim to know what changed (no historical definitions are stored).
	 * 3. **Earner / claim** — a client overlay gated on `isClaimable`, computed in
	 *    the browser from the run store. A stranger never sees it.
	 *
	 * Jobs 1–2 are complete without JS (SSR). Job 3 enhances after hydration.
	 * `completion`/`priorClaim` are Storybook seams — when given they win over the
	 * browser stores, mirroring how `ScenarioPage` takes `storedRun`.
	 */
	let {
		badge,
		criteriaNarrative,
		achievementId,
		criteriaId,
		versionMismatch,
		blocked = {},
		completion,
		priorClaim,
		claimErrorForStory
	}: {
		badge: BadgeDefinition;
		criteriaNarrative: string;
		achievementId: string;
		criteriaId: string;
		versionMismatch: boolean;
		blocked?: Record<string, CannotServe>;
		completion?: CompletionResult;
		priorClaim?: BadgeClaimSnapshot | null;
		claimErrorForStory?: ClaimError;
	} = $props();

	const perspective = perspectiveStore();
	const role = $derived(roleBySlug(badge.role));
	const baseProfile = $derived(profileBySlug(badge.baseProfile));

	// Store-derived state, filled on mount so SSR renders the stranger view. The
	// Storybook props (`completion`/`priorClaim`/`claimErrorForStory`) win over
	// these in the deriveds below, so nothing is mirrored from a prop into state.
	let storeResult = $state<CompletionResult | undefined>(undefined);
	let storePrior = $state<BadgeClaimSnapshot | undefined>(undefined);
	let claimedPrior = $state<BadgeClaimSnapshot | undefined>(undefined);
	let claimLink = $state<ClaimLink | undefined>();
	let driverError = $state<ClaimError | undefined>(undefined);
	let claiming = $state(false);
	let handle: { stop: () => void } | undefined;
	let claimedAt = '';

	onMount(() => {
		if (completion === undefined) {
			storeResult = evaluateCompletion({ ...badgeKey(badge), runs: allScenarioRuns(), blocked });
		}
		if (priorClaim === undefined) storePrior = latestClaimFor(badge.slug);
	});
	onDestroy(() => handle?.stop());

	// A given prop wins; otherwise the store value. `priorClaim === null` is an
	// explicit "no prior claim" (Storybook), distinct from `undefined` = read store.
	const result = $derived(completion ?? storeResult);
	const prior = $derived(
		claimedPrior ?? (priorClaim === undefined ? storePrior : (priorClaim ?? undefined))
	);
	const error = $derived(driverError ?? claimErrorForStory);

	// A `complete` badge is cumulative — Essential ∪ Expanded — while base/additive
	// score the base meter. The tier picks which numbers drive claimability and
	// which ride in the award narrative; both come from `claimable.ts` so the page
	// and the meter cannot disagree.
	const isExpanded = $derived(badge.tier === 'expanded');
	const claimable = $derived(
		result ? (isExpanded ? isExpandedClaimable(result) : isClaimable(result)) : false
	);
	const tierTotals = $derived(
		result
			? isExpanded
				? completeTotals(result)
				: { met: result.met, total: result.total }
			: { met: 0, total: 0 }
	);
	const tierMet = $derived(tierTotals.met);
	const tierTotal = $derived(tierTotals.total);
	const scenarioCount = $derived(scenariosBehindBadge(badge).length);
	const newInfo = $derived(prior ? newSince(prior, requirementIdsBehindBadge(badge)) : undefined);

	/** Which single overlay the earner sees. A stranger stays on `'none'`. */
	const phase = $derived(
		error ? 'failed' : claiming ? 'claiming' : prior ? 'claimed' : claimable ? 'claimable' : 'none'
	);

	const panelData: ExchangeRunnerPanelData = $derived({
		intent: 'issuance',
		protocol: claimLink?.protocol ?? 'oid4vci',
		run: phase === 'failed' ? 'error' : 'awaiting-wallet',
		perStep: ['in-flight'],
		interactionUrl: claimLink?.interactionUrl,
		exchangeId: claimLink?.exchangeId,
		error
	});

	function startClaim() {
		if (!result) return;
		driverError = undefined;
		claiming = true;
		claimedAt = new Date().toISOString();
		handle = startBadgeClaim(
			badge.slug,
			{
				requirementsMet: tierMet,
				requirementsTotal: tierTotal,
				scenarioCount,
				claimedAt
			},
			{
				onLink: (link) => {
					claimLink = link;
				},
				onSettled: () => {
					// Same `claimedAt` sent to the endpoint, so the credential date and the
					// stored snapshot agree.
					recordBadgeClaim(claimSnapshot(badge, claimedAt));
					claimedPrior = latestClaimFor(badge.slug) ?? claimSnapshot(badge, claimedAt);
					claiming = false;
					claimLink = undefined;
					handle = undefined;
				},
				onFailed: (failure) => {
					driverError = failure;
					claiming = false;
					claimLink = undefined;
					handle?.stop();
					handle = undefined;
				}
			}
		);
	}
</script>

<article class="mx-auto max-w-2xl space-y-6">
	<PageHero perspective={perspective.current} onPerspectiveChange={(p) => perspective.choose(p)}>
		{#snippet breadcrumb()}
			<a href={resolve('/')} class="text-primary hover:underline">Home</a>
			<span aria-hidden="true">›</span>
			<a href={profileHref(badge.baseProfile)} class="text-primary hover:underline">
				{baseProfile?.name ?? badge.baseProfile}
			</a>
		{/snippet}
		{#snippet eyebrow()}Badge{/snippet}
		{#snippet title()}{badge.name}{/snippet}
		{#snippet lede()}{criteriaNarrative}{/snippet}
		{#snippet chips()}
			{#if role}
				<ContextChip kind="role" label={role.name} href={roleHref(role.slug)} />
			{/if}
			<ContextChip
				kind="profile"
				label={baseProfile?.name ?? badge.baseProfile}
				href={profileHref(badge.baseProfile)}
			/>
			{#if badge.tier === 'add-on'}
				<ContextChip
					kind="addon"
					label={additiveProfileBySlug(badge.additiveProfile)?.name ?? badge.additiveProfile}
					href={additiveProfileHref(badge.additiveProfile)}
				/>
			{/if}
		{/snippet}
	</PageHero>

	<dl class="space-y-2 rounded-md border border-border p-4 text-body-md">
		<div class="flex flex-col gap-1">
			<dt class="text-label-md text-muted-foreground">Achievement</dt>
			<dd class="font-mono text-xs break-all text-foreground">{achievementId}</dd>
		</div>
		<div class="flex flex-col gap-1">
			<dt class="text-label-md text-muted-foreground">Criteria (this version)</dt>
			<dd class="font-mono text-xs break-all text-foreground">{criteriaId}</dd>
		</div>
	</dl>

	{#if versionMismatch}
		<div class="space-y-1 rounded-md border border-border bg-muted/40 p-4">
			<p class="text-label-md font-medium text-muted-foreground">Older version</p>
			<p class="text-body-md text-foreground">
				This badge was awarded against an earlier version of the scenarios or profile. The criteria
				shown here are the current ones.
			</p>
		</div>
	{/if}

	{#if phase === 'claimed' && prior}
		<div class="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-4">
			<p class="text-label-md font-medium text-primary">Claimed</p>
			<p class="text-body-md text-foreground">
				Claimed {formatDay(prior.claimedAt)} against {prior.requirementIds.length}
				{prior.requirementIds.length === 1 ? 'requirement' : 'requirements'}{newInfo &&
				newInfo.count > 0
					? ` · ${newInfo.count} new since`
					: ''}
			</p>
		</div>
	{:else if phase === 'claiming' || phase === 'failed'}
		<div class="space-y-3">
			{#if phase === 'claiming'}
				<p class="text-body-md text-foreground">
					Accept the badge into your wallet from the link below.
				</p>
			{/if}
			<ExchangeRunnerPanel
				data={panelData}
				actions={phase === 'failed' ? { onRetry: startClaim } : {}}
			/>
		</div>
	{:else if phase === 'claimable'}
		<div class="flex flex-col gap-1">
			<Button type="button" class="w-fit" onclick={startClaim}>Claim badge</Button>
			<span class="text-label-md text-muted-foreground">
				Your {isExpanded ? 'expanded' : 'required'} set is complete — claim this badge into your wallet.
			</span>
		</div>
	{/if}
</article>
