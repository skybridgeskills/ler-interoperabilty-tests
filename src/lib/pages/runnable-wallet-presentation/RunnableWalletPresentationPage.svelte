<script lang="ts">
	import { onDestroy, untrack } from 'svelte';

	import {
		pollExchange,
		type ExchangePollError,
		type ExchangePollResponse
	} from '$lib/client/exchange-runner/index.js';
	import { recordRun } from '$lib/client/run-history/index.js';
	import {
		ExchangeRunnerPanel,
		type ExchangeProtocolId
	} from '$lib/components/interop/exchange-runner/index.js';
	import { RequirementReport } from '$lib/components/interop/issuer-runner/requirement-report/index.js';
	import {
		statusesFromOutcomes,
		statusesFromStepStates
	} from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunnableChecklist,
		RunStateBadge
	} from '$lib/components/interop/runnable-checklist/index.js';
	import {
		combinationFor,
		combinedRequirements,
		roleBySlug,
		runChecklistFingerprint,
		statusFromWalletReport,
		testRunRecord,
		workflowBySlug,
		type ChecklistRunState,
		type StepRunState
	} from '$lib/interop/index.js';
	import type { ProfileSlug } from '$lib/interop/profile-schema.js';
	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import {
		fetchPresentScore,
		outcomesById,
		PresentScoreError,
		stepStatesFromReport
	} from './present-score.js';

	// The runnable wallet credential-presentation page, parametrized by profile.
	// `profile` is fixed for the lifetime of the route mount. Black-box: the
	// operator wallet drives a real verification exchange; we only observe the
	// settled result and score it — no built-in wallet.
	let { profile = 'vcalm' }: { profile?: ProfileSlug } = $props();

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-presentation')!;
	const combo = $derived(combinationFor('wallet', 'credential-presentation', profile)!);
	const stepCount = $derived(combo.checklist.steps.length);

	const isOid4 = $derived(profile === 'oid4');
	// oid4 renders the OID4VP deep link; vcalm renders the VCALM interaction URL.
	const protocol = $derived<ExchangeProtocolId>(isOid4 ? 'oid4vp' : 'vcalm');

	type CreateExchangeBody = {
		exchangeId: string;
		protocols: { iu: string; OID4VP?: string };
	};

	type RunnerError = { message: string; hint?: string };

	// Honest, step-level copy for each requirement row's `<details>` disclosure
	// while the exchange is still in flight (pre-settle, before the report scores).
	const stepDetailCopy: Record<StepRunState, string | undefined> = {
		pending: undefined,
		'in-flight':
			'The verification exchange is in flight. Progress is tracked per step until the wallet presents and we score the result.',
		complete: undefined,
		failed: 'The exchange ended in an invalid state at this step.',
		skipped: 'The run errored before reaching this step.'
	};

	/** Per-step disclosure copy, in the `{ message }` shape `statusesFromStepStates` expects. */
	const detailFor = (state: StepRunState) => ({ message: stepDetailCopy[state] });

	let exchangeId = $state<string | undefined>(undefined);
	// The single protocol link this profile presents (VCALM `iu` OR the OID4VP request).
	let interactionUrl = $state<string | undefined>(undefined);
	let runState = $state<ChecklistRunState>('idle');
	let perStep = $state<StepRunState[]>(
		untrack(() => Array.from({ length: stepCount }, () => 'pending'))
	);
	let runnerError = $state<RunnerError | undefined>(undefined);

	// Per-requirement report, set once the exchange settles and is scored. While
	// undefined, requirement rows fall back to their step-derived status.
	let report = $state<IssuerRunnerReport | undefined>(undefined);
	let outcomes = $state<Record<string, CheckOutcome>>({});

	// Combined requirement set — the fingerprint and the persisted per-requirement `statuses` map are
	// both keyed against these ids. Tier A: once settled, each requirement carries its own scored
	// outcome; pre-settle the rows share their step's live run state.
	const requirements = $derived(combinedRequirements('wallet', 'credential-presentation', profile));
	const checklistFingerprint = $derived(runChecklistFingerprint(requirements));
	// Presentation-ready per-requirement statuses (keyed by requirement id). After the exchange
	// settles these come from the scored per-requirement outcomes; while in flight they mirror the
	// step-level progress so the left column lights up live.
	const statuses = $derived(
		report
			? statusesFromOutcomes(requirements, outcomes)
			: statusesFromStepStates(combo.checklist.steps, perStep, detailFor)
	);

	let pollHandle: { stop: () => void } | undefined;
	// Score + record exactly once per run.
	let scoring = false;
	let recorded = false;

	function setIdle() {
		exchangeId = undefined;
		interactionUrl = undefined;
		runState = 'idle';
		perStep = Array.from({ length: stepCount }, () => 'pending');
		runnerError = undefined;
		report = undefined;
		outcomes = {};
		scoring = false;
		recorded = false;
		pollHandle?.stop();
		pollHandle = undefined;
	}

	function setError(error: RunnerError) {
		runState = 'error';
		runnerError = error;
		perStep = Array.from({ length: stepCount }, () => 'skipped');
	}

	/** Create a fresh verification exchange; sets the error affordance on failure. */
	async function createExchange(): Promise<CreateExchangeBody | undefined> {
		const res = await fetch('/api/exchange-runner/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ intent: 'verification' })
		});
		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as RunnerError;
			setError({
				message: body.message ?? `Initiate responded ${res.status}`,
				hint: body.hint ?? 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
			});
			return undefined;
		}
		return (await res.json()) as CreateExchangeBody;
	}

	/**
	 * Score the settled exchange via the P3 endpoint, light up the per-requirement
	 * report, and record the run once. Runs at most once per exchange (the poller
	 * only surfaces a terminal state once, and `scoring`/`recorded` guard reentry).
	 */
	async function settleAndScore(id: string) {
		if (scoring || recorded) return;
		scoring = true;
		try {
			const result = await fetchPresentScore({ exchangeId: id, profile });
			if (!result.settled) return; // Contractually unreachable on a terminal poll.

			const byId = outcomesById(result.report);
			report = result.report;
			outcomes = byId;
			perStep = stepStatesFromReport(combo.checklist.steps, byId);

			const verified = result.report.verified;
			runState = verified && result.state === 'complete' ? 'complete' : 'error';
			runnerError = verified
				? undefined
				: {
						message: `${result.failingMustCount} MUST requirement${
							result.failingMustCount === 1 ? '' : 's'
						} failed, or the exchange ended invalid.`,
						hint: 'See the per-requirement report below for details.'
					};

			recorded = true;
			recordRun(
				testRunRecord({
					role: 'wallet',
					workflow: 'credential-presentation',
					profile,
					status: statusFromWalletReport({ verified, exchangeState: result.state }),
					checklistFingerprint,
					statuses: statusesFromOutcomes(requirements, byId)
				})
			);
		} catch (e) {
			setError(
				e instanceof PresentScoreError
					? { message: e.message, hint: e.hint }
					: {
							message: e instanceof Error ? e.message : String(e),
							hint: 'Check the transaction service logs (`docker logs lits-transaction-service`).'
						}
			);
		} finally {
			scoring = false;
		}
	}

	function startPolling(id: string) {
		pollHandle?.stop();
		pollHandle = pollExchange(
			id,
			{
				onUpdate: (response: ExchangePollResponse) => {
					// On a terminal exchange, defer the display to the P3 score; otherwise
					// reflect the derived two-phase progress.
					if (response.derived.run === 'complete' || response.derived.run === 'error') {
						void settleAndScore(id);
						return;
					}
					runState = response.derived.run;
					perStep = response.derived.perStep;
				},
				onError: (e: ExchangePollError) => {
					pollHandle?.stop();
					setError({
						message:
							e.kind === 'http-error'
								? `Polling responded ${e.status ?? '<no status>'}`
								: e.message,
						hint: 'Check the transaction service logs (`docker logs lits-transaction-service`).'
					});
				},
				onTimeout: () => {
					setError({
						message: 'No presentation from the wallet within the 5-minute window.',
						hint: 'Generate a new exchange and try again.'
					});
				}
			},
			{ stepCount, workflow: 'verify' }
		);
	}

	async function initiate() {
		runnerError = undefined;
		report = undefined;
		outcomes = {};
		scoring = false;
		recorded = false;
		try {
			const data = await createExchange();
			if (!data) return;
			exchangeId = data.exchangeId;
			if (isOid4) {
				if (!data.protocols.OID4VP) {
					setError({
						message: 'The transaction service did not return an OID4VP request.',
						hint: 'Point TRANSACTION_SERVICE_URL at an OID4VP-capable transaction service (the local feature/oid4vp build).'
					});
					return;
				}
				interactionUrl = data.protocols.OID4VP;
			} else {
				interactionUrl = data.protocols.iu;
			}
			runState = 'awaiting-wallet';
			const restPending: StepRunState[] = Array.from({ length: stepCount - 1 }, () => 'pending');
			perStep = ['in-flight', ...restPending];
			startPolling(data.exchangeId);
		} catch (e) {
			setError({
				message: e instanceof Error ? e.message : String(e),
				hint: 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
			});
		}
	}

	onDestroy(() => {
		pollHandle?.stop();
		pollHandle = undefined;
	});

	const panelData = $derived({
		intent: 'verification' as const,
		protocol,
		run: runState,
		perStep,
		interactionUrl,
		exchangeId,
		error: runnerError
	});
</script>

<RunnableChecklist checklist={combo.checklist} profile={combo.profile} {workflow} {role} {statuses}>
	{#snippet headerBadge()}
		<RunStateBadge {runState} />
	{/snippet}
	{#snippet rightColumn()}
		<ExchangeRunnerPanel
			data={panelData}
			actions={{ onInitiate: initiate, onRetry: initiate, onReset: setIdle }}
		/>
		{#if report}
			<div class="mt-6">
				<RequirementReport {report} />
			</div>
		{/if}
	{/snippet}
</RunnableChecklist>
