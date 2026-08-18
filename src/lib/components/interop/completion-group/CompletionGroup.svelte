<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { type ClaimedInfo, formatDay } from '$lib/interop/badges/index.js';
	import {
		type CompletionResult,
		isClaimable,
		obligationsByWorkflow,
		type ObligationProgress
	} from '$lib/interop/completion/index.js';
	import { scenarioHref, workflowBySlug } from '$lib/interop/index.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

	import CompletionMeter from './CompletionMeter.svelte';
	import ScenarioRow from './ScenarioRow.svelte';

	/**
	 * One `(profile, role)` completion set: a header with a role badge, the profile
	 * name, its meter and claim affordance; a body of workflow-grouped obligation
	 * rows; and an optional sub-section beside the base meter.
	 *
	 * Purely presentational. Every completion number arrives pre-computed in
	 * `result` (M4's `evaluateCompletion`). The single claimability check is
	 * `isClaimable(result)`, shared with the meter's fill so the header cannot
	 * lie — this component derives no `met === total` of its own.
	 */
	let {
		profileName,
		roleName,
		result,
		runs,
		claimHref,
		claim
	}: {
		profileName: string;
		roleName: string;
		result: CompletionResult;
		/** Latest run per scenario slug, for each row's status and last-run hint. */
		runs: Record<string, ScenarioRunRecord>;
		/** The registered badge's `/badges/[slug]` route. Undefined → the control stays disabled. */
		claimHref?: string;
		/** Present once this group's badge has been claimed — drives the claimed line. */
		claim?: ClaimedInfo;
	} = $props();

	const claimable = $derived(isClaimable(result));
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

<section class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
	<header class="space-y-3">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<Badge variant="secondary">{roleName}</Badge>
			<h3 class="text-title-lg text-foreground">{profileName}</h3>
		</div>
		<CompletionMeter met={result.met} total={result.total} />
		<div class="flex flex-col gap-1">
			{#if claimHref}
				<Button href={claimHref} variant={claimable ? 'default' : 'secondary'} class="w-fit">
					{claimable ? 'Claim badge' : 'Badge not ready'}
				</Button>
			{:else}
				<Button disabled variant="secondary" class="w-fit">
					{claimable ? 'Badge ready' : 'Claim badge'}
				</Button>
				{#if claimable}
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

	{#if result.optional.obligations.length > 0}
		<div class="space-y-4 rounded-md border border-dashed border-border bg-muted/30 p-4">
			<div class="space-y-2">
				<h4 class="text-label-md text-muted-foreground">Optional</h4>
				<CompletionMeter met={result.optional.met} total={result.optional.total} />
			</div>
			<div class="space-y-5">
				{@render obligationList(result.optional.obligations)}
			</div>
		</div>
	{/if}
</section>
