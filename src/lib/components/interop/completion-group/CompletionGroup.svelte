<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { type ClaimedInfo, formatDay } from '$lib/interop/badges/index.js';
	import {
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
	 * One `(profile, role)` completion **bundle**.
	 *
	 * A base profile with an expanded (`optional`) set renders as **two tiers** —
	 * **Core** (`required` scenarios → the base badge) and **Complete** (`optional`
	 * scenarios in the same base profile → the "— Complete" badge). Both meters and
	 * both claim affordances sit in the header; the body lists Core and Complete
	 * scenarios in colour-cued sections. A group with no expanded set (an additive
	 * profile, or a base profile before any optional scenario exists) renders as a
	 * single tier, exactly as before.
	 *
	 * Purely presentational. Every completion number arrives pre-computed in
	 * `result` (M4's `evaluateCompletion`). Each tier's claim affordance shares its
	 * meter's fill through the one claimability predicate for that tier
	 * (`isClaimable` / `isExpandedClaimable`), so a header cannot lie.
	 */
	let {
		profileName,
		roleName,
		result,
		runs,
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

	const coreClaimable = $derived(isClaimable(result));
	const expandedClaimable = $derived(isExpandedClaimable(result));
	const hasExpanded = $derived(result.optional.obligations.length > 0);
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

{#snippet tierSummary(
	label: string,
	tone: 'core' | 'complete',
	met: number,
	total: number,
	name: string,
	href: string | undefined,
	claimable: boolean,
	claimInfo: ClaimedInfo | undefined,
	variant: 'default' | 'secondary'
)}
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
		<div class="flex min-w-0 flex-1 items-center gap-2.5">
			<span class={`size-2 shrink-0 rounded-full ${tone === 'core' ? 'bg-primary' : 'bg-accent'}`}
			></span>
			<span
				class={`w-20 shrink-0 text-label-md ${tone === 'core' ? 'text-primary' : 'text-accent'}`}
				>{label}</span
			>
			<div class="min-w-0 flex-1">
				<CompletionMeter {met} {total} showPercent />
			</div>
		</div>
		<div class="shrink-0 sm:w-64">
			{@render claimAffordance(name, href, claimable, claimInfo, variant)}
		</div>
	</div>
{/snippet}

{#snippet bodyCategory(
	heading: string,
	tone: 'core' | 'complete',
	obligations: ObligationProgress[]
)}
	<div>
		<div class="mb-3 flex items-center gap-2">
			<span class={`size-2 shrink-0 rounded-full ${tone === 'core' ? 'bg-primary' : 'bg-accent'}`}
			></span>
			<span class={`text-label-md ${tone === 'core' ? 'text-primary' : 'text-accent'}`}
				>{heading}</span
			>
		</div>
		<div
			class={`space-y-5 border-l-2 pl-4 ${tone === 'core' ? 'border-l-primary/30' : 'border-l-accent/30'}`}
		>
			{@render obligationList(obligations)}
		</div>
	</div>
{/snippet}

{#if hasExpanded}
	<!--
		Two-tier bundle. Both meters and both claim affordances live in the header,
		so neither claim is buried; the body splits Core / Complete with a colour cue
		(Core = primary, Complete = accent) echoed from the header dots.
	-->
	<section class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
		<header class="space-y-4">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
				<Badge variant="secondary">{roleName}</Badge>
				<h3 class="text-title-lg text-foreground">{profileName}</h3>
			</div>
			<div class="space-y-3">
				{@render tierSummary(
					'Core',
					'core',
					result.met,
					result.total,
					baseBadgeName,
					claimHref,
					coreClaimable,
					claim,
					'default'
				)}
				{@render tierSummary(
					'Complete',
					'complete',
					result.optional.met,
					result.optional.total,
					completeBadgeName,
					expandedClaimHref,
					expandedClaimable,
					expandedClaim,
					'secondary'
				)}
			</div>
		</header>

		<div class="space-y-6 border-t border-border pt-4">
			{@render bodyCategory('Core scenarios', 'core', result.obligations)}
			{@render bodyCategory('Complete — the expanded set', 'complete', result.optional.obligations)}
		</div>
	</section>
{:else}
	<!-- Single tier: an additive profile, or a base profile before any optional scenario exists. -->
	<section class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
		<header class="space-y-3">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
				<Badge variant="secondary">{roleName}</Badge>
				<h3 class="text-title-lg text-foreground">{profileName}</h3>
			</div>
			<CompletionMeter met={result.met} total={result.total} />
			<div class="flex flex-col gap-1">
				{#if claimHref}
					<Button href={claimHref} variant={coreClaimable ? 'default' : 'secondary'} class="w-fit">
						{coreClaimable ? 'Claim badge' : 'Badge not ready'}
					</Button>
				{:else}
					<Button disabled variant="secondary" class="w-fit">
						{coreClaimable ? 'Badge ready' : 'Claim badge'}
					</Button>
					{#if coreClaimable}
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
	</section>
{/if}
