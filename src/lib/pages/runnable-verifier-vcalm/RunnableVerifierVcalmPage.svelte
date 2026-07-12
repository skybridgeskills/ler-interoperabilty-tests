<script lang="ts">
	import { recordRun } from '$lib/client/run-history/index.js';
	import { MobileWalletDrawer } from '$lib/components/interop/mobile-wallet-drawer/index.js';
	import { statusesFromVerifierOutcomes } from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunResultCard,
		type RunResultOutcome
	} from '$lib/components/interop/run-result-card/index.js';
	import {
		RunnableChecklist,
		RunStateBadge
	} from '$lib/components/interop/runnable-checklist/index.js';
	import { VerifierPassesWallet } from '$lib/components/interop/test-wallet/index.js';
	import {
		combinationFor,
		combinedRequirements,
		roleBySlug,
		runChecklistFingerprint,
		statusFromVerifierReport,
		testRunRecord,
		workflowBySlug,
		type ChecklistRunState
	} from '$lib/interop/index.js';
	import type {
		PassAttestation,
		PassVerdict,
		PresentEvidence,
		RejectionReason,
		VerifierCheckOutcome,
		VerifierRunnerReport,
		VerifierRunPlan
	} from '$lib/interop/verifier-run/index.js';
	import type { WalletActivity } from '$lib/interop/wallet-activity.js';
	import PresentationRequestField from '$lib/pages/runnable-verifier-oid4/PresentationRequestField.svelte';

	import {
		buildAttestation,
		currentOutcomesById,
		passArtifactViews,
		replaceEvidence,
		revealedActivity,
		scoreRequestBody,
		scoringActivity,
		startedActivity,
		verdictEchoActivity
	} from './vcalm-verify-flow.js';

	/**
	 * Runnable verifier × credential-request-and-verification × VCALM page. The
	 * test wallet is the holder-interlocutor: the operator pastes their verifier's
	 * VC-API interaction URL; for each credential the suite engages a FRESH
	 * single-use exchange (fetch → `vcapi` → read the presentation request),
	 * generates a fixture at present time, signs a VP embedding it (satisfying the
	 * QueryByExample + DIDAuthentication queries), and submits it, asking inside
	 * its surface what the verifier decided. The automated floor lights from the
	 * first credential's engagement; a transport miss lets the operator paste a
	 * fresh interaction URL and re-present that credential before recording a
	 * verdict. After the last verdict it `score`s. The plan is credential-less —
	 * no pass `kind` is ever rendered before the reveal.
	 */
	type Stage = 'idle' | 'starting' | 'collecting' | 'scoring' | 'done' | 'error';

	const CRYPTOSUITE = 'eddsa-rdfc-2022';
	const role = roleBySlug('verifier')!;
	const workflow = workflowBySlug('credential-request-and-verification')!;
	const combo = combinationFor('verifier', 'credential-request-and-verification', 'vcalm')!;
	// Combined requirement set — the fingerprint and the persisted `statuses` map are both
	// keyed against these ids.
	const requirements = combinedRequirements(
		'verifier',
		'credential-request-and-verification',
		'vcalm'
	);
	const checklistFingerprint = runChecklistFingerprint(requirements);

	let stage = $state<Stage>('idle');
	let plan = $state<VerifierRunPlan | undefined>(undefined);
	let floorOutcomes = $state<VerifierCheckOutcome[]>([]);
	let narration = $state<WalletActivity[]>([]);
	let evidence = $state<PresentEvidence[]>([]);
	let attestations = $state<PassAttestation[]>([]);
	let report = $state<VerifierRunnerReport | undefined>(undefined);
	let errorInfo = $state<{ message: string; hint?: string } | undefined>(undefined);
	let verdict = $state<PassVerdict | undefined>(undefined);
	let reason = $state<RejectionReason | ''>('');
	let requestInput = $state('');
	let presentBusy = $state(false);
	let presentError = $state('');

	const active = $derived(stage === 'starting' || stage === 'collecting' || stage === 'scoring');
	const collecting = $derived(stage === 'collecting');
	const currentIndex = $derived(attestations.length);
	const hasCurrentEvidence = $derived(evidence.length > currentIndex);
	const currentPassNumber = $derived(
		collecting && plan && currentIndex < plan.entries.length ? currentIndex + 1 : undefined
	);
	const awaitingRequest = $derived(
		collecting && currentPassNumber !== undefined && !hasCurrentEvidence && currentIndex >= 1
	);
	const retryable = $derived(
		collecting && hasCurrentEvidence && evidence[currentIndex]?.submitted === false
	);
	const showVerdict = $derived(collecting && hasCurrentEvidence);
	const showRequestField = $derived(awaitingRequest || retryable);
	const presentNote = $derived(
		presentError !== ''
			? presentError
			: retryable
				? 'The presentation was not accepted at the exchange. VCALM exchanges are single-use — paste a fresh interaction URL and re-present, or record the verdict below.'
				: undefined
	);

	const activity = $derived<WalletActivity[]>(
		report ? [...narration, ...report.activity] : narration
	);
	const passArtifacts = $derived(
		plan ? passArtifactViews({ plan, evidence, attestations, report }) : []
	);
	const byId = $derived(currentOutcomesById(report, floorOutcomes));
	// Persisted, presentation-ready per-requirement statuses (keyed by requirement id).
	// The left column renders these live, and the run record persists this exact map.
	const statuses = $derived(statusesFromVerifierOutcomes(requirements, byId));

	const walletState = $derived(
		stage === 'idle' ? 'idle' : stage === 'done' ? 'done' : stage === 'error' ? 'error' : 'running'
	);

	const runState = $derived<ChecklistRunState>(
		stage === 'done'
			? report?.verified
				? 'complete'
				: 'error'
			: stage === 'error'
				? 'error'
				: stage === 'idle'
					? 'idle'
					: 'wallet-connected'
	);
	const resultOutcome = $derived<RunResultOutcome | undefined>(
		stage === 'done'
			? report?.verified
				? 'verified'
				: 'not-verified'
			: stage === 'error'
				? 'error'
				: undefined
	);

	/** Read the API error shape `{ error: { message, hint? } }` defensively. */
	async function errorOf(res: Response): Promise<{ message: string; hint?: string }> {
		try {
			const body = (await res.json()) as { error?: { message?: string; hint?: string } };
			return {
				message: body.error?.message ?? `Request failed (${res.status}).`,
				hint: body.error?.hint
			};
		} catch {
			return { message: `Request failed (${res.status}).` };
		}
	}

	async function postJson(path: string, body: unknown): Promise<Response> {
		return fetch(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	type PresentOk = {
		evidence: PresentEvidence;
		floorOutcomes: VerifierCheckOutcome[];
		activity: WalletActivity[];
	};

	/** Present one plan entry over a fresh exchange; transport failure is evidence, not an error. */
	async function presentOne(
		index: number,
		interactionUrl: string
	): Promise<{ ok?: PresentOk; error?: { message: string; hint?: string } }> {
		if (!plan) return { error: { message: 'No run plan.' } };
		presentBusy = true;
		try {
			const res = await postJson('/api/verifier-runner/vcalm/present', {
				entry: plan.entries[index],
				interactionUrl,
				cryptosuite: CRYPTOSUITE
			});
			if (!res.ok) return { error: await errorOf(res) };
			return { ok: (await res.json()) as PresentOk };
		} catch (e) {
			return { error: { message: e instanceof Error ? e.message : String(e) } };
		} finally {
			presentBusy = false;
		}
	}

	async function startPasses() {
		const input0 = requestInput.trim();
		if (input0 === '') return;
		beginReset();
		stage = 'starting';
		try {
			const planRes = await postJson('/api/verifier-runner/vcalm/plan', {});
			if (!planRes.ok) return fail(await errorOf(planRes));
			plan = (await planRes.json()) as VerifierRunPlan;
			narration = [startedActivity(plan.entries.length)];

			const first = await presentOne(0, input0);
			if (first.error) return fail(first.error);
			const ok = first.ok!;
			evidence = [ok.evidence];
			floorOutcomes = ok.floorOutcomes;
			// Pass 1 narrates the exchange floor + the hand-off.
			narration = [...narration, ...ok.activity];
			stage = 'collecting';
		} catch (e) {
			fail({ message: e instanceof Error ? e.message : String(e) });
		}
	}

	/** Present the current credential (credentials 2–4, or a retry of the current one). */
	async function presentCurrent() {
		if (!plan) return;
		const index = currentIndex;
		const input = requestInput.trim();
		if (input === '') return;
		presentError = '';
		const result = await presentOne(index, input);
		if (result.error) {
			presentError = result.error.message;
			return;
		}
		const ok = result.ok!;
		evidence =
			evidence.length > index
				? replaceEvidence(evidence, index, ok.evidence)
				: [...evidence, ok.evidence];
		// Later credentials narrate only the hand-off (the floor was shown for credential 1).
		const handoff = ok.activity.at(-1);
		if (handoff) narration = [...narration, handoff];
	}

	function confirmVerdict() {
		if (!plan || verdict === undefined) return;
		const entry = plan.entries[currentIndex];
		const attestation = buildAttestation(entry.passId, verdict, reason);
		attestations = [...attestations, attestation];
		narration = [...narration, verdictEchoActivity(entry, attestation)];
		verdict = undefined;
		reason = '';
		if (attestations.length < plan.entries.length) {
			// The next credential needs a fresh single-use exchange.
			requestInput = '';
			presentError = '';
		} else {
			void score();
		}
	}

	async function score() {
		if (!plan) return;
		stage = 'scoring';
		narration = [...narration, scoringActivity()];
		try {
			const res = await postJson(
				'/api/verifier-runner/vcalm/score',
				scoreRequestBody({ plan, evidence, attestations, floorOutcomes })
			);
			if (!res.ok) return fail(await errorOf(res));
			const scored = (await res.json()) as VerifierRunnerReport;
			narration = [...narration, revealedActivity()];
			report = scored;
			stage = 'done';
			recordRun(
				testRunRecord({
					role: 'verifier',
					workflow: 'credential-request-and-verification',
					profile: 'vcalm',
					status: statusFromVerifierReport({ verified: scored.verified }),
					checklistFingerprint,
					statuses
				})
			);
		} catch (e) {
			fail({ message: e instanceof Error ? e.message : String(e) });
		}
	}

	function fail(info: { message: string; hint?: string }) {
		errorInfo = info;
		stage = 'error';
	}

	/** Clear run-derived state but keep the pasted interaction URL (used when (re)starting). */
	function beginReset() {
		plan = undefined;
		floorOutcomes = [];
		narration = [];
		evidence = [];
		attestations = [];
		report = undefined;
		errorInfo = undefined;
		verdict = undefined;
		reason = '';
		presentError = '';
	}

	function reset() {
		beginReset();
		requestInput = '';
		stage = 'idle';
	}
</script>

<RunnableChecklist checklist={combo.checklist} profile={combo.profile} {workflow} {role} {statuses}>
	{#snippet headerBadge()}
		<RunStateBadge {runState} />
	{/snippet}
	{#snippet rightColumn()}
		{#snippet requestField()}
			<PresentationRequestField
				credentialNumber={currentIndex + 1}
				bind:value={requestInput}
				reuse={false}
				canReuse={false}
				busy={presentBusy}
				note={presentNote}
				retry={retryable}
				prompt="Paste a fresh interaction URL from your verifier"
				placeholder="https://…/exchanges/… (a fresh VC-API exchange — each is single-use)"
				onPresent={() => void presentCurrent()}
			/>
		{/snippet}
		<MobileWalletDrawer ctaLabel={stage === 'idle' ? 'Start verifying' : undefined}>
			<RunResultCard
				outcome={resultOutcome}
				failingMustCount={report?.failingMustCount ?? 0}
				message={errorInfo?.message}
				hint={errorInfo?.hint}
			/>
			<VerifierPassesWallet
				state={walletState}
				busy={active}
				{activity}
				{passArtifacts}
				{currentPassNumber}
				totalPasses={plan?.entries.length}
				inputLabel={stage === 'idle' ? 'Interaction URL' : undefined}
				inputPlaceholder="https://…/exchanges/… (a fresh VC-API exchange)"
				multiline
				bind:value={requestInput}
				actionLabel="Start verifying"
				runningLabel="Verifying in progress"
				requestField={showRequestField ? requestField : undefined}
				{showVerdict}
				bind:verdict
				bind:reason
				onStart={() => void startPasses()}
				onConfirm={confirmVerdict}
				onReset={reset}
			/>
		</MobileWalletDrawer>
	{/snippet}
</RunnableChecklist>
