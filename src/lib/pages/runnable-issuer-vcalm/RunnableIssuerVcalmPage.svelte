<script lang="ts">
	import { onMount } from 'svelte';

	import { recordRun } from '$lib/client/run-history/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveChecklistSection } from '$lib/components/interop/additive-checklist-section/index.js';
	import { MobileWalletDrawer } from '$lib/components/interop/mobile-wallet-drawer/index.js';
	import {
		RequirementStatusRow,
		outcomeToRequirementStatus,
		statusesFromOutcomes
	} from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunResultCard,
		type RunResultOutcome
	} from '$lib/components/interop/run-result-card/index.js';
	import {
		RunnableChecklist,
		RunStateBadge
	} from '$lib/components/interop/runnable-checklist/index.js';
	import { VcalmIssuerFlowWallet } from '$lib/components/interop/test-wallet/index.js';
	import {
		additiveChecklistsForCombination,
		combinationFor,
		combinedRequirements,
		roleBySlug,
		runChecklistFingerprint,
		statusFromIssuerReport,
		testRunRecord,
		workflowBySlug,
		type ChecklistRunState
	} from '$lib/interop/index.js';
	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';
	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

	import { evidenceForRequirement } from './vcalm-issuer-evidence.js';

	/**
	 * Runnable issuer × credential-issuance × VCALM page. The user pastes the interaction URL they
	 * generated on their issuer; a single `POST /api/wallet-runner/issuer-vcalm/run` drives the test
	 * wallet to completion and returns per-requirement outcomes, which light up the left-column
	 * checklist inline. Run-to-completion: the flow stops at the first blocking failure, and
	 * requirements past that point stay pending.
	 */
	type Cryptosuite = 'eddsa-rdfc-2022' | 'ecdsa-rdfc-2019';
	type RunRaw = { interaction?: unknown; didAuth?: unknown; delivery?: unknown; verify?: unknown };
	type RunResponse = {
		outcomes: CheckOutcome[];
		additiveOutcomes?: CheckOutcome[];
		blocked: boolean;
		stoppedAtStep?: number;
		verified: boolean;
		failingMustCount: number;
		raw: RunRaw;
		walletActivity?: WalletActivity[];
		artifacts?: WalletArtifact[];
	};
	type RunError = { message: string; hint?: string };

	const role = roleBySlug('issuer')!;
	const workflow = workflowBySlug('credential-issuance')!;
	const combo = combinationFor('issuer', 'credential-issuance', 'vcalm')!;
	const additives = additiveChecklistsForCombination(
		combo.profile.slug,
		'issuer',
		'credential-issuance'
	);
	// Combined requirement set (base + applicable additives) — the fingerprint and the
	// persisted `statuses` map are both keyed against these ids.
	const requirements = combinedRequirements('issuer', 'credential-issuance', 'vcalm');
	const checklistFingerprint = runChecklistFingerprint(requirements);

	onMount(() => {
		selectionStore.hydrate();
	});

	let interactionUrl = $state('');
	let cryptosuite = $state<Cryptosuite>('eddsa-rdfc-2022');
	let busy = $state(false);
	let done = $state(false);
	let blocked = $state(false);
	let stoppedAtStep = $state<number | undefined>(undefined);
	let verified = $state(false);
	let failingMustCount = $state(0);
	let error = $state<RunError | undefined>(undefined);
	let outcomesById = $state<Record<string, CheckOutcome>>({});
	let additiveOutcomesById = $state<Record<string, CheckOutcome>>({});
	let raw = $state<RunRaw>({});
	let runState = $state<ChecklistRunState>('idle');
	let activity = $state<WalletActivity[]>([]);
	let artifacts = $state<WalletArtifact[]>([]);

	/** Lifecycle state for the test-wallet variant (distinct from the checklist `runState`). */
	const walletState = $derived<'idle' | 'running' | 'done' | 'error'>(
		busy ? 'running' : error ? 'error' : done ? 'done' : 'idle'
	);
	/** Overall verdict for the right-column result card; `undefined` before a run completes. */
	const resultOutcome = $derived<RunResultOutcome | undefined>(
		error
			? 'error'
			: !done
				? undefined
				: verified
					? 'verified'
					: blocked
						? 'stopped-early'
						: 'not-verified'
	);

	// Persisted, presentation-ready per-requirement statuses (keyed by requirement id).
	// The left column renders these live, and the run record persists this exact map.
	const statuses = $derived(
		statusesFromOutcomes(requirements, { ...outcomesById, ...additiveOutcomesById })
	);

	function reset() {
		busy = false;
		done = false;
		blocked = false;
		stoppedAtStep = undefined;
		verified = false;
		failingMustCount = 0;
		error = undefined;
		outcomesById = {};
		additiveOutcomesById = {};
		raw = {};
		runState = 'idle';
		activity = [];
		artifacts = [];
	}

	async function run() {
		if (busy || !interactionUrl.trim()) return;
		busy = true;
		error = undefined;
		done = false;
		outcomesById = {};
		additiveOutcomesById = {};
		raw = {};
		activity = [];
		artifacts = [];
		runState = 'awaiting-wallet';
		try {
			const res = await fetch('/api/wallet-runner/issuer-vcalm/run', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					interactionUrl: interactionUrl.trim(),
					cryptosuite,
					additiveProfiles: [...selectionStore.additiveProfiles]
				})
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as RunError;
				error = { message: body.message ?? `Run responded ${res.status}`, hint: body.hint };
				runState = 'error';
				return;
			}
			const data = (await res.json()) as RunResponse;
			outcomesById = Object.fromEntries(data.outcomes.map((o) => [o.id, o]));
			additiveOutcomesById = Object.fromEntries(
				(data.additiveOutcomes ?? []).map((o) => [o.id, o])
			);
			raw = data.raw ?? {};
			activity = data.walletActivity ?? [];
			artifacts = data.artifacts ?? [];
			blocked = data.blocked;
			stoppedAtStep = data.stoppedAtStep;
			verified = data.verified;
			failingMustCount = data.failingMustCount;
			done = true;

			runState = !data.blocked && data.verified ? 'complete' : 'error';

			recordRun(
				testRunRecord({
					role: 'issuer',
					workflow: 'credential-issuance',
					profile: 'vcalm',
					status: statusFromIssuerReport({ verified: data.verified }),
					checklistFingerprint,
					statuses
				})
			);
		} catch (e) {
			error = {
				message: e instanceof Error ? e.message : String(e),
				hint: 'Confirm the interaction URL is reachable from this server.'
			};
			runState = 'error';
		} finally {
			busy = false;
		}
	}
</script>

<RunnableChecklist checklist={combo.checklist} profile={combo.profile} {workflow} {role} {statuses}>
	{#snippet headerBadge()}
		<RunStateBadge {runState} />
	{/snippet}
	{#snippet requirementState({ requirement })}
		<RequirementStatusRow
			{requirement}
			status={outcomeToRequirementStatus(
				outcomesById[requirement.id],
				done ? evidenceForRequirement(requirement.id, raw) : undefined
			)}
		/>
	{/snippet}
	{#snippet rightColumn()}
		<MobileWalletDrawer ctaLabel={walletState === 'idle' ? 'Run the test wallet' : undefined}>
			<RunResultCard
				outcome={resultOutcome}
				{failingMustCount}
				{stoppedAtStep}
				message={error?.message}
				hint={error?.hint}
			/>
			<VcalmIssuerFlowWallet
				bind:value={interactionUrl}
				bind:cryptosuite
				state={walletState}
				{busy}
				{activity}
				{artifacts}
				onRun={run}
				onReset={reset}
			/>
		</MobileWalletDrawer>
	{/snippet}
	{#snippet belowSteps()}
		{#if additives.length}
			<section class="space-y-6">
				{#each additives as { additive, checklist: additiveChecklist } (additive.slug)}
					<AdditiveChecklistSection
						{additive}
						checklist={additiveChecklist}
						baseProfileName={combo.profile.name}
						selected={selectionStore.isAdditiveProfileSelected(additive.slug)}
						onToggle={selectionStore.toggleAdditiveProfile}
					>
						{#snippet requirementState({ requirement })}
							<RequirementStatusRow
								{requirement}
								status={outcomeToRequirementStatus(
									requirement.id ? additiveOutcomesById[requirement.id] : undefined,
									done ? raw.delivery : undefined
								)}
							/>
						{/snippet}
					</AdditiveChecklistSection>
				{/each}
			</section>
		{/if}
	{/snippet}
</RunnableChecklist>
