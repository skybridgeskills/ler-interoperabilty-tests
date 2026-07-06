<script lang="ts">
	import { recordRun } from '$lib/client/run-history/index.js';
	import { MobileWalletDrawer } from '$lib/components/interop/mobile-wallet-drawer/index.js';
	import {
		RequirementStatusRow,
		verifierOutcomeToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunResultCard,
		type RunResultOutcome
	} from '$lib/components/interop/run-result-card/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import { VerifierPassesWallet } from '$lib/components/interop/test-wallet/index.js';
	import {
		combinationFor,
		roleBySlug,
		verifierReportRunRecord,
		workflowBySlug,
		type ChecklistRunState,
		type StepRunState
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

	import {
		buildAttestation,
		currentOutcomesById,
		defaultReuseRequest,
		outcomeForRequirement,
		passArtifactViews,
		presentedActivity,
		replaceEvidence,
		requestForPresent,
		revealedActivity,
		scoreRequestBody,
		scoringActivity,
		startedActivity,
		stepStatesFor,
		verdictEchoActivity
	} from './oid4-verify-flow.js';
	import PresentationRequestField from './PresentationRequestField.svelte';

	/**
	 * Runnable verifier × credential-request-and-verification × OID4VP page. The
	 * test wallet is the holder-interlocutor: the operator pastes their verifier's
	 * `openid4vp://` request; the suite runs the automated floor (`inspect`), then
	 * per credential generates a fixture at present time, signs it, and submits via
	 * `direct_post` (`present`), asking inside its surface what the verifier
	 * decided. A fresh request can be pasted per credential ("use the same request"
	 * when the verifier permits reuse); a transport miss lets the operator paste a
	 * fresh request and re-present that credential before recording a verdict.
	 * After the last verdict it `score`s. The plan is credential-less — no pass
	 * `kind` is ever rendered before the reveal.
	 */
	type Stage = 'idle' | 'starting' | 'collecting' | 'scoring' | 'done' | 'error';

	const CRYPTOSUITE = 'eddsa-rdfc-2022';
	const role = roleBySlug('verifier')!;
	const workflow = workflowBySlug('credential-request-and-verification')!;
	const combo = combinationFor('verifier', 'credential-request-and-verification', 'oid4')!;
	const steps = combo.checklist.steps;

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
	let reuseRequest = $state(false);
	let lastRequest = $state('');
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
	const canReuse = $derived(lastRequest.trim().length > 0);
	const presentNote = $derived(
		presentError !== ''
			? presentError
			: retryable
				? 'The presentation was not accepted at the response endpoint. If your verifier one-times its requests, paste a fresh one and re-present; otherwise record the verdict below.'
				: undefined
	);

	const activity = $derived<WalletActivity[]>(
		report ? [...narration, ...report.activity] : narration
	);
	const passArtifacts = $derived(
		plan ? passArtifactViews({ plan, evidence, attestations, report }) : []
	);
	const byId = $derived(currentOutcomesById(report, floorOutcomes));

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
	const perStep = $derived<StepRunState[]>(stepStatesFor({ steps, report, busy: active }));
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

	/** Present one plan entry with the given request; transport failure is evidence, not an error. */
	async function presentOne(
		index: number,
		input: string
	): Promise<{ evidence?: PresentEvidence; error?: { message: string; hint?: string } }> {
		if (!plan) return { error: { message: 'No run plan.' } };
		presentBusy = true;
		try {
			const res = await postJson('/api/verifier-runner/oid4/present', {
				entry: plan.entries[index],
				input,
				cryptosuite: CRYPTOSUITE
			});
			if (!res.ok) return { error: await errorOf(res) };
			const body = (await res.json()) as { evidence: PresentEvidence };
			return { evidence: body.evidence };
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
			const planRes = await postJson('/api/verifier-runner/oid4/plan', {});
			if (!planRes.ok) return fail(await errorOf(planRes));
			plan = (await planRes.json()) as VerifierRunPlan;
			narration = [startedActivity(plan.entries.length)];

			const inspectRes = await postJson('/api/verifier-runner/oid4/inspect', {
				input: input0,
				cryptosuite: CRYPTOSUITE
			});
			if (!inspectRes.ok) return fail(await errorOf(inspectRes));
			const inspectBody = (await inspectRes.json()) as {
				outcomes: VerifierCheckOutcome[];
				activity: WalletActivity[];
			};
			floorOutcomes = inspectBody.outcomes;
			narration = [...narration, ...inspectBody.activity];

			const first = await presentOne(0, input0);
			if (first.error) return fail(first.error);
			const ev = first.evidence!;
			evidence = [ev];
			if (ev.submitted) lastRequest = input0;
			narration = [
				...narration,
				presentedActivity(plan.entries[0], 0, plan.entries.length, ev.submitted)
			];
			stage = 'collecting';
		} catch (e) {
			fail({ message: e instanceof Error ? e.message : String(e) });
		}
	}

	/** Present the current credential (credentials 2–4, or a retry of the current one). */
	async function presentCurrent() {
		if (!plan) return;
		const index = currentIndex;
		const input = requestForPresent(reuseRequest && canReuse, requestInput, lastRequest).trim();
		if (input === '') return;
		presentError = '';
		const result = await presentOne(index, input);
		if (result.error) {
			presentError = result.error.message;
			return;
		}
		const ev = result.evidence!;
		evidence = evidence.length > index ? replaceEvidence(evidence, index, ev) : [...evidence, ev];
		if (ev.submitted) lastRequest = input;
		narration = [
			...narration,
			presentedActivity(plan.entries[index], index, plan.entries.length, ev.submitted)
		];
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
			// Set up the next credential's request step.
			reuseRequest = defaultReuseRequest(evidence[attestations.length - 1]);
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
				'/api/verifier-runner/oid4/score',
				scoreRequestBody({ plan, evidence, attestations, floorOutcomes })
			);
			if (!res.ok) return fail(await errorOf(res));
			const scored = (await res.json()) as VerifierRunnerReport;
			narration = [...narration, revealedActivity()];
			report = scored;
			stage = 'done';
			recordRun(
				verifierReportRunRecord({
					role: 'verifier',
					workflow: 'credential-request-and-verification',
					profile: 'oid4',
					verified: scored.verified,
					failingMustCount: scored.failingMustCount,
					attestedPassCount: attestations.length
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

	/** Clear run-derived state but keep the pasted request (used when (re)starting). */
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
		reuseRequest = false;
		lastRequest = '';
		presentError = '';
	}

	function reset() {
		beginReset();
		requestInput = '';
		stage = 'idle';
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
		{#snippet requestField()}
			<PresentationRequestField
				credentialNumber={currentIndex + 1}
				bind:value={requestInput}
				bind:reuse={reuseRequest}
				{canReuse}
				busy={presentBusy}
				note={presentNote}
				retry={retryable}
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
				inputLabel={stage === 'idle' ? 'Presentation request' : undefined}
				inputPlaceholder="openid4vp://… (or a request_uri URL or the request JSON)"
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

	{#snippet requirementState({ requirement })}
		<RequirementStatusRow
			{requirement}
			status={verifierOutcomeToRequirementStatus(outcomeForRequirement(byId, requirement))}
		/>
	{/snippet}
</RunnableChecklist>
