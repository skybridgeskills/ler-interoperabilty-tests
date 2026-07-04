<script lang="ts">
	import { onMount } from 'svelte';

	import { recordRun } from '$lib/client/run-history/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveChecklistSection } from '$lib/components/interop/additive-checklist-section/index.js';
	import { MobileWalletDrawer } from '$lib/components/interop/mobile-wallet-drawer/index.js';
	import {
		RequirementStatusRow,
		outcomeToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunResultCard,
		type RunResultOutcome
	} from '$lib/components/interop/run-result-card/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import { Oid4IssuerFlowWallet } from '$lib/components/interop/test-wallet/index.js';
	import {
		additiveChecklistsForCombination,
		combinationFor,
		issuerReportRunRecord,
		roleBySlug,
		workflowBySlug,
		type ChecklistRunState,
		type StepRunState
	} from '$lib/interop/index.js';
	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';
	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

	/**
	 * Runnable issuer × credential-issuance × OID4 page. The user pastes an
	 * `openid-credential-offer://` URL they generated on their OID4VCI issuer; a single
	 * `POST /api/wallet-runner/issuer-oid4/run` drives the test wallet through the pre-authorized-code
	 * flow to completion and returns per-requirement outcomes, which light up the left-column
	 * checklist inline. Run-to-completion: the flow stops at the first blocking failure, and
	 * requirements past that point stay pending.
	 */
	type Cryptosuite = 'eddsa-rdfc-2022' | 'ecdsa-rdfc-2019';
	type RunRaw = {
		offer?: unknown;
		issuerMeta?: unknown;
		asMeta?: unknown;
		token?: unknown;
		nonce?: unknown;
		delivery?: unknown;
		verify?: unknown;
		transcript?: unknown;
	};
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
	const combo = combinationFor('issuer', 'credential-issuance', 'oid4')!;
	const stepCount = combo.checklist.steps.length;
	const additives = additiveChecklistsForCombination(
		combo.profile.slug,
		'issuer',
		'credential-issuance'
	);

	onMount(() => {
		selectionStore.hydrate();
	});

	let offerUrl = $state('');
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
	let perStep = $state<StepRunState[]>(Array.from({ length: stepCount }, () => 'pending'));
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
		perStep = Array.from({ length: stepCount }, () => 'pending');
		activity = [];
		artifacts = [];
	}

	/**
	 * Derive each step's indicator status from its requirements' outcomes: `failed` if any
	 * requirement failed, `complete` when all its requirements resolved without a failure, and
	 * `pending` when none have run yet (i.e. the flow stopped before reaching this step).
	 */
	function deriveStepStates(): StepRunState[] {
		return combo.checklist.steps.map((step) => {
			const outs = step.requirements
				.map((r) => (r.id ? outcomesById[r.id] : undefined))
				.filter((o): o is CheckOutcome => !!o);
			if (outs.some((o) => o.status === 'fail')) return 'failed';
			if (step.requirements.length > 0 && outs.length === step.requirements.length)
				return 'complete';
			if (outs.length > 0) return 'in-flight';
			return 'pending';
		});
	}

	/** Map a checklist step index to the raw response body most relevant to it (D3 transcript on step 3). */
	function rawForStep(stepIndex: number): unknown {
		if (stepIndex === 0)
			return { offer: raw.offer, issuerMeta: raw.issuerMeta, asMeta: raw.asMeta };
		if (stepIndex === 1) return { token: raw.token, nonce: raw.nonce };
		return { delivery: raw.delivery, verify: raw.verify, transcript: raw.transcript };
	}

	async function run() {
		if (busy || !offerUrl.trim()) return;
		busy = true;
		error = undefined;
		done = false;
		outcomesById = {};
		additiveOutcomesById = {};
		raw = {};
		activity = [];
		artifacts = [];
		runState = 'awaiting-wallet';
		perStep = [
			'in-flight',
			...Array.from({ length: stepCount - 1 }, () => 'pending' as StepRunState)
		];
		try {
			const res = await fetch('/api/wallet-runner/issuer-oid4/run', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					offerUrl: offerUrl.trim(),
					cryptosuite,
					additiveProfiles: [...selectionStore.additiveProfiles]
				})
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as RunError;
				error = { message: body.message ?? `Run responded ${res.status}`, hint: body.hint };
				runState = 'error';
				perStep = Array.from({ length: stepCount }, () => 'skipped');
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
			perStep = deriveStepStates();

			recordRun(
				issuerReportRunRecord({
					role: 'issuer',
					workflow: 'credential-issuance',
					profile: 'oid4',
					verified: data.verified,
					failingMustCount: data.failingMustCount
				})
			);
		} catch (e) {
			error = {
				message: e instanceof Error ? e.message : String(e),
				hint: 'Confirm the credential-offer URL is reachable from this server.'
			};
			runState = 'error';
			perStep = Array.from({ length: stepCount }, () => 'skipped');
		} finally {
			busy = false;
		}
	}
</script>

<RunnableChecklist
	checklist={combo.checklist}
	profile={combo.profile}
	{workflow}
	{role}
	{runState}
	{perStep}
>
	{#snippet rightColumn()}
		<MobileWalletDrawer ctaLabel={walletState === 'idle' ? 'Run the test wallet' : undefined}>
			<RunResultCard
				outcome={resultOutcome}
				{failingMustCount}
				{stoppedAtStep}
				message={error?.message}
				hint={error?.hint}
			/>
			<Oid4IssuerFlowWallet
				bind:value={offerUrl}
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
	{#snippet requirementState({ requirement, stepIndex })}
		<RequirementStatusRow
			{requirement}
			status={outcomeToRequirementStatus(
				requirement.id ? outcomesById[requirement.id] : undefined,
				done ? rawForStep(stepIndex) : undefined
			)}
		/>
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
