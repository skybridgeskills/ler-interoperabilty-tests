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
		type PassAttestation,
		type PassVerdict,
		type RejectionReason,
		type StepRunState,
		type VerifierRunDefinition,
		type VerifierRunnerReport
	} from '$lib/interop/index.js';
	import type { WalletActivity } from '$lib/interop/wallet-activity.js';

	import {
		buildAttestation,
		deriveStepStates,
		handOffActivity,
		outcomeForRequirement,
		outcomesById,
		passArtifactViews,
		revealedActivity,
		scoreRequestBody,
		scoringActivity,
		startedActivity,
		verdictEchoActivity
	} from './verifier-pass-flow.js';

	/**
	 * Runnable verifier × direct-credential-verification × OB3 Direct Delivery page. The test
	 * wallet is the interlocutor: it generates four unlabeled acceptance-pass credentials
	 * (`generate`), hands them over one at a time (copy/download in its artifact list), asks
	 * inside its own surface what the operator's verifier decided, then `score`s the
	 * attestations. The run definition — ground truth included — lives in page state, and the
	 * UI's one discipline is that no pass `kind` is ever rendered before the reveal.
	 */
	type Stage = 'idle' | 'generating' | 'collecting' | 'scoring' | 'done' | 'error';

	const role = roleBySlug('verifier')!;
	const workflow = workflowBySlug('direct-credential-verification')!;
	const combo = combinationFor(
		'verifier',
		'direct-credential-verification',
		'ob3-direct-delivery'
	)!;
	const stepCount = combo.checklist.steps.length;

	let stage = $state<Stage>('idle');
	let run = $state<VerifierRunDefinition | undefined>(undefined);
	let attestations = $state<PassAttestation[]>([]);
	let narration = $state<WalletActivity[]>([]);
	let report = $state<VerifierRunnerReport | undefined>(undefined);
	let errorInfo = $state<{ message: string; hint?: string } | undefined>(undefined);
	let verdict = $state<PassVerdict | undefined>(undefined);
	let reason = $state<RejectionReason | ''>('');

	const collecting = $derived(stage === 'collecting');
	const currentPassNumber = $derived(collecting && run ? attestations.length + 1 : undefined);
	/** The reveal lands in the SAME log: client narration + the report's check entries. */
	const activity = $derived<WalletActivity[]>(
		report ? [...narration, ...report.activity] : narration
	);
	const passArtifacts = $derived(
		run
			? passArtifactViews({
					run,
					handedCount: Math.min(run.passes.length, attestations.length + (collecting ? 1 : 0)),
					attestations,
					report
				})
			: []
	);
	const byId = $derived(outcomesById(report));

	const walletState = $derived(
		stage === 'idle' ? 'idle' : stage === 'done' ? 'done' : stage === 'error' ? 'error' : 'running'
	);
	const busy = $derived(stage === 'generating' || collecting || stage === 'scoring');

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
	const perStep = $derived<StepRunState[]>(
		report
			? deriveStepStates(combo.checklist.steps, byId)
			: Array.from({ length: stepCount }, (_, i) =>
					busy && i === stepCount - 1 ? 'in-flight' : 'pending'
				)
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

	async function startPasses() {
		reset();
		stage = 'generating';
		try {
			const res = await fetch('/api/verifier-runner/direct-delivery/generate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({})
			});
			if (!res.ok) {
				errorInfo = await errorOf(res);
				stage = 'error';
				return;
			}
			run = (await res.json()) as VerifierRunDefinition;
			narration = [startedActivity(run), ...handOffActivity(run.passes[0], 0, run.passes.length)];
			stage = 'collecting';
		} catch (e) {
			errorInfo = { message: e instanceof Error ? e.message : String(e) };
			stage = 'error';
		}
	}

	function confirmVerdict() {
		if (!run || verdict === undefined) return;
		const pass = run.passes[attestations.length];
		const attestation = buildAttestation(pass.passId, verdict, reason);
		attestations = [...attestations, attestation];
		narration = [...narration, verdictEchoActivity(pass, attestation)];
		verdict = undefined;
		reason = '';
		if (attestations.length < run.passes.length) {
			const next = run.passes[attestations.length];
			narration = [...narration, ...handOffActivity(next, attestations.length, run.passes.length)];
		} else {
			void score();
		}
	}

	async function score() {
		if (!run) return;
		stage = 'scoring';
		narration = [...narration, scoringActivity()];
		try {
			const res = await fetch('/api/verifier-runner/direct-delivery/score', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(scoreRequestBody(run, attestations))
			});
			if (!res.ok) {
				errorInfo = await errorOf(res);
				stage = 'error';
				return;
			}
			const scored = (await res.json()) as VerifierRunnerReport;
			narration = [...narration, revealedActivity()];
			report = scored;
			stage = 'done';
			recordRun(
				verifierReportRunRecord({
					role: 'verifier',
					workflow: 'direct-credential-verification',
					profile: 'ob3-direct-delivery',
					verified: scored.verified,
					failingMustCount: scored.failingMustCount,
					attestedPassCount: attestations.length
				})
			);
		} catch (e) {
			errorInfo = { message: e instanceof Error ? e.message : String(e) };
			stage = 'error';
		}
	}

	function reset() {
		stage = 'idle';
		run = undefined;
		attestations = [];
		narration = [];
		report = undefined;
		errorInfo = undefined;
		verdict = undefined;
		reason = '';
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
		<MobileWalletDrawer ctaLabel={stage === 'idle' ? 'Start verifying' : undefined}>
			<RunResultCard
				outcome={resultOutcome}
				failingMustCount={report?.failingMustCount ?? 0}
				message={errorInfo?.message}
				hint={errorInfo?.hint}
			/>
			<VerifierPassesWallet
				state={walletState}
				{busy}
				{activity}
				{passArtifacts}
				{currentPassNumber}
				totalPasses={run?.passes.length}
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
