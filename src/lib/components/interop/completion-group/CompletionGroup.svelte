<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { type ClaimedInfo, formatDay } from '$lib/interop/badges/index.js';
	import {
		type AdditiveSliceData,
		completeTotals,
		type CompletionResult,
		isClaimable,
		isExpandedClaimable,
		obligationsByWorkflow,
		type ObligationProgress
	} from '$lib/interop/completion/index.js';
	import { scenarioHref, workflowBySlug } from '$lib/interop/index.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

	import CompletionMeter from './CompletionMeter.svelte';
	import ScenarioRow from './ScenarioRow.svelte';

	/**
	 * One `(profile, role)` completion **bundle**, in up to three kinds of
	 * category.
	 *
	 * - **Essential** — the profile's `required`/`oneOf` scenarios → the base badge.
	 * - **Complete** — **cumulative**: Essential ∪ the profile's own `optional`
	 *   set → the "— Complete" badge. Its meter therefore spans two body sections,
	 *   which is why **every section heading carries its own count**: `8/13 + 0/4 =
	 *   8/17` has to be a sum the reader can do from the rows on screen, or a
	 *   cumulative meter is unauditable.
	 * - **Add-ons** — one section per selected additive profile that reaches this
	 *   `(profile, role)`, ordered **below** Complete and counted toward **neither**
	 *   base tier. An additive layers work many implementers will never want; a
	 *   denominator they cannot opt out of would put Complete out of their reach.
	 *   The section shows a **slice** — this base profile's share of an additive
	 *   whose badge spans several — so it carries no claim control.
	 *
	 * A group with no expanded set and no selected add-on renders as a single flat
	 * list with one meter, exactly as before.
	 *
	 * Purely presentational. Every completion number arrives pre-computed; each
	 * tier's claim affordance shares its meter's fill through the one claimability
	 * predicate for that tier (`isClaimable` / `isExpandedClaimable`), so a header
	 * cannot lie.
	 */
	let {
		profileName,
		roleName,
		result,
		runs,
		additives = [],
		claimHref,
		claim,
		baseBadgeName = 'badge',
		expandedClaimHref,
		expandedClaim,
		completeBadgeName = 'complete badge'
	}: {
		profileName: string;
		roleName: string;
		result: CompletionResult;
		/** Latest run per scenario slug, for each row's status and last-run hint. */
		runs: Record<string, ScenarioRunRecord>;
		/** Selected add-ons that reach this group, each with its slice. Ordered by catalog. */
		additives?: AdditiveSliceData[];
		/** The base badge's `/badges/[slug]` route. Undefined → the control stays disabled. */
		claimHref?: string;
		/** Present once the base badge has been claimed — drives the claimed line. */
		claim?: ClaimedInfo;
		/** Base badge display name, e.g. "OID4 Wallet". Falls back to a generic label. */
		baseBadgeName?: string;
		/** The Complete badge's `/badges/[slug]` route. Undefined → disabled. */
		expandedClaimHref?: string;
		/** Present once the Complete badge has been claimed. */
		expandedClaim?: ClaimedInfo;
		/** Complete badge display name, e.g. "OID4 Wallet — Complete". */
		completeBadgeName?: string;
	} = $props();

	type Tone = 'essential' | 'complete' | 'additive';

	const essentialClaimable = $derived(isClaimable(result));
	const completeClaimable = $derived(isExpandedClaimable(result));
	const complete = $derived(completeTotals(result));
	const hasExpanded = $derived(result.optional.obligations.length > 0);

	/**
	 * One flat list and one meter is the shape of 7 of the 8 catalog scenarios.
	 * Categories only earn their headings once there is more than one.
	 */
	const categorised = $derived(hasExpanded || additives.length > 0);

	/**
	 * An add-on is single-tier — its badge scores every level it declares — so its
	 * category shows the whole slice, `required` and `optional` together.
	 */
	function sliceRows(slice: AdditiveSliceData): ObligationProgress[] {
		return [...slice.result.obligations, ...slice.result.optional.obligations];
	}

	const dotClass = (tone: Tone) =>
		tone === 'essential' ? 'bg-primary' : tone === 'complete' ? 'bg-accent' : 'bg-live';
	const textClass = (tone: Tone) =>
		tone === 'essential' ? 'text-primary' : tone === 'complete' ? 'text-accent' : 'text-live';
	const ruleClass = (tone: Tone) =>
		tone === 'essential'
			? 'border-l-primary/30'
			: tone === 'complete'
				? 'border-l-accent/30'
				: 'border-l-live/40';
</script>

{#snippet obligationList(obligations: ObligationProgress[])}
	{#each obligationsByWorkflow(obligations) as group (group.workflow)}
		<div class="space-y-2">
			<h4 class="text-label-md text-muted-foreground">
				{workflowBySlug(group.workflow)?.name ?? group.workflow}
			</h4>
			<div class="space-y-3">
				{#each group.obligations as progress, i (i)}
					{#if progress.obligation.kind === 'scenario'}
						<ScenarioRow
							name={progress.obligation.scenario.name}
							href={scenarioHref(progress.obligation.scenario.slug)}
							met={progress.met}
							total={progress.total}
							run={runs[progress.obligation.scenario.slug]}
							blocked={progress.blocked}
						/>
					{:else}
						<div class="space-y-2 rounded-md border border-border p-3">
							<div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
								<span class="text-label-md text-muted-foreground">Any one of</span>
								<span class="text-label-md whitespace-nowrap text-muted-foreground">
									{progress.met}/{progress.total} requirements
								</span>
							</div>
							<div class="space-y-3">
								{#each progress.obligation.members as member (member.slug)}
									<ScenarioRow
										name={member.name}
										href={scenarioHref(member.slug)}
										met={progress.met}
										total={progress.total}
										run={runs[member.slug]}
										blocked={progress.blocked}
									/>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
{/snippet}

{#snippet claimAffordance(
	name: string,
	href: string | undefined,
	claimable: boolean,
	claimInfo: ClaimedInfo | undefined,
	variant: 'default' | 'secondary'
)}
	<div class="flex flex-col gap-1">
		{#if href && claimable}
			<Button {href} {variant} class="w-fit">Claim {name}</Button>
		{:else}
			<Button disabled variant="secondary" class="w-fit">Claim {name}</Button>
		{/if}
		{#if claimInfo}
			<span class="text-label-md text-muted-foreground">
				Claimed {formatDay(claimInfo.claimedAt)} against {claimInfo.requirementCount}
				{claimInfo.requirementCount === 1 ? 'requirement' : 'requirements'}{claimInfo.newSince > 0
					? ` · ${claimInfo.newSince} new since`
					: ''}
			</span>
		{/if}
	</div>
{/snippet}

{#snippet tierRow(label: string, tone: Tone, met: number, total: number, note?: string)}
	<!--
		Below `sm:` the bar drops to its own full-width line: sharing the line with
		the label squeezes it, and an add-on's longer label squeezes it to a stub.
		The note sits after the numbers rather than in the label column, where
		"Complete · Essential + 4" wrapped to three lines and made the header ragged.
	-->
	<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
		<span class={`size-2 shrink-0 rounded-full ${dotClass(tone)}`}></span>
		<span class={`shrink-0 text-label-md leading-tight sm:w-32 ${textClass(tone)}`}>{label}</span>
		<!--
			`min-w-48` is load-bearing: `flex-1` alone lets the bar shrink to nothing
			once a long tier label and a note compete for the same line, which is
			exactly what a three-tier card does. A meter with no bar is not a meter.
		-->
		<div class="w-full min-w-0 sm:w-auto sm:min-w-48 sm:flex-1">
			<CompletionMeter {met} {total} showPercent />
		</div>
		{#if note}
			<span class="shrink-0 text-label-md whitespace-nowrap text-muted-foreground">
				· {note}
			</span>
		{/if}
	</div>
{/snippet}

{#snippet categoryHeading(label: string, tone: Tone, met: number, total: number, note?: string)}
	<div class="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
		<span class={`size-2 shrink-0 self-center rounded-full ${dotClass(tone)}`}></span>
		<span class={`text-label-md ${textClass(tone)}`}>{label}</span>
		<!-- The count in every heading is what makes the cumulative Complete meter checkable. -->
		<span class="text-label-md text-muted-foreground">{met}/{total}</span>
		{#if note}
			<span class="text-label-md text-muted-foreground">· {note}</span>
		{/if}
	</div>
{/snippet}

{#snippet category(
	label: string,
	tone: Tone,
	met: number,
	total: number,
	obligations: ObligationProgress[],
	note?: string
)}
	<div>
		{@render categoryHeading(label, tone, met, total, note)}
		<div class={`space-y-5 border-l-2 pl-4 ${ruleClass(tone)}`}>
			{@render obligationList(obligations)}
		</div>
	</div>
{/snippet}

<section class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
	{#if categorised}
		<header class="space-y-4">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
				<Badge variant="secondary">{roleName}</Badge>
				<h3 class="text-title-lg text-foreground">{profileName}</h3>
			</div>
			<div class="space-y-3">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
					{@render tierRow('Essential', 'essential', result.met, result.total)}
					<div class="shrink-0 sm:w-64">
						{@render claimAffordance(
							baseBadgeName,
							claimHref,
							essentialClaimable,
							claim,
							'default'
						)}
					</div>
				</div>

				{#if hasExpanded}
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
						{@render tierRow(
							'Complete',
							'complete',
							complete.met,
							complete.total,
							`Essential + ${result.optional.total}`
						)}
						<div class="shrink-0 sm:w-64">
							{@render claimAffordance(
								completeBadgeName,
								expandedClaimHref,
								completeClaimable,
								expandedClaim,
								'secondary'
							)}
						</div>
					</div>
				{/if}

				{#each additives as slice (slice.slug)}
					{@const totals = completeTotals(slice.result)}
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
						{@render tierRow(slice.name, 'additive', totals.met, totals.total, 'Add-on')}
						<!--
							No claim here on purpose: an additive badge spans every base profile
							it applies to, and this card shows one profile's slice of it.
						-->
						<div class="shrink-0 sm:w-64">
							<span class="text-label-md text-muted-foreground">Claimed on its add-on page</span>
						</div>
					</div>
				{/each}
			</div>
		</header>

		<div class="space-y-6 border-t border-border pt-4">
			{@render category(
				'Essential interoperability',
				'essential',
				result.met,
				result.total,
				result.obligations
			)}
			{#if hasExpanded}
				{@render category(
					'Expanded interoperability',
					'complete',
					result.optional.met,
					result.optional.total,
					result.optional.obligations
				)}
			{/if}
			{#each additives as slice (slice.slug)}
				{@const totals = completeTotals(slice.result)}
				{@render category(
					slice.name,
					'additive',
					totals.met,
					totals.total,
					sliceRows(slice),
					'add-on'
				)}
			{/each}
		</div>
	{:else}
		<!-- Single category: no expanded set and no add-on selected. Unchanged shape. -->
		<header class="space-y-3">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
				<Badge variant="secondary">{roleName}</Badge>
				<h3 class="text-title-lg text-foreground">{profileName}</h3>
			</div>
			<CompletionMeter met={result.met} total={result.total} />
			<div class="flex flex-col gap-1">
				{#if claimHref}
					<Button
						href={claimHref}
						variant={essentialClaimable ? 'default' : 'secondary'}
						class="w-fit"
					>
						{essentialClaimable ? 'Claim badge' : 'Badge not ready'}
					</Button>
				{:else}
					<Button disabled variant="secondary" class="w-fit">
						{essentialClaimable ? 'Badge ready' : 'Claim badge'}
					</Button>
					{#if essentialClaimable}
						<span class="text-label-md text-muted-foreground">Claiming coming soon</span>
					{/if}
				{/if}
				{#if claim}
					<span class="text-label-md text-muted-foreground">
						Claimed {formatDay(claim.claimedAt)} against {claim.requirementCount}
						{claim.requirementCount === 1 ? 'requirement' : 'requirements'}{claim.newSince > 0
							? ` · ${claim.newSince} new since`
							: ''}
					</span>
				{/if}
			</div>
		</header>

		<div class="space-y-5 border-t border-border pt-4">
			{@render obligationList(result.obligations)}
		</div>
	{/if}
</section>
