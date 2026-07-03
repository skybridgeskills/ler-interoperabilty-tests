<script lang="ts">
	import { recordRun } from '$lib/client/run-history/index.js';
	import { IssuerFlowWalletPanel } from '$lib/components/interop/issuer-flow-runner/index.js';
	import {
		RequirementStatusRow,
		outcomeToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import {
		combinationFor,
		issuerReportRunRecord,
		roleBySlug,
		workflowBySlug,
		type ChecklistRunState,
		type StepRunState
	} from '$lib/interop/index.js';
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
		blocked: boolean;
		stoppedAtStep?: number;
		verified: boolean;
		failingMustCount: number;
		raw: RunRaw;
	};
	type RunError = { message: string; hint?: string };

	const role = roleBySlug('issuer')!;
	const workflow = workflowBySlug('credential-issuance')!;
	const combo = combinationFor('issuer', 'credential-issuance', 'oid4')!;
	const stepCount = combo.checklist.steps.length;

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
	let raw = $state<RunRaw>({});
	let runState = $state<ChecklistRunState>('idle');
	let perStep = $state<StepRunState[]>(Array.from({ length: stepCount }, () => 'pending'));

	function reset() {
		busy = false;
		done = false;
		blocked = false;
		stoppedAtStep = undefined;
		verified = false;
		failingMustCount = 0;
		error = undefined;
		outcomesById = {};
		raw = {};
		runState = 'idle';
		perStep = Array.from({ length: stepCount }, () => 'pending');
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
		raw = {};
		runState = 'awaiting-wallet';
		perStep = [
			'in-flight',
			...Array.from({ length: stepCount - 1 }, () => 'pending' as StepRunState)
		];
		try {
			const res = await fetch('/api/wallet-runner/issuer-oid4/run', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ offerUrl: offerUrl.trim(), cryptosuite })
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
			raw = data.raw ?? {};
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
		<IssuerFlowWalletPanel
			bind:interactionUrl={offerUrl}
			bind:cryptosuite
			{busy}
			{done}
			{blocked}
			{stoppedAtStep}
			{verified}
			{failingMustCount}
			{error}
			title="Run the test wallet against your OID4VCI issuer"
			blurb="Paste the `openid-credential-offer://` URL you generated on your issuer. The test wallet acts as the holder — discovering issuer metadata, redeeming the pre-authorized code, presenting a `di_vp` key proof, and receiving the credential — then lights up each requirement below with a pass, fail, warning, or n/a."
			inputLabel="Credential offer URL"
			inputPlaceholder="openid-credential-offer://?credential_offer_uri=…"
			inputType="text"
			verifiedCopy="The test wallet completed the whole OID4VCI pre-authorized-code issuance flow and no MUST requirements failed."
			onRun={run}
			onReset={reset}
		/>
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
</RunnableChecklist>
