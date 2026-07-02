<script lang="ts">
	import { onDestroy, untrack } from 'svelte';

	import {
		pollExchange,
		type ExchangePollError,
		type ExchangePollResponse
	} from '$lib/client/exchange-runner/index.js';
	import { recordRun } from '$lib/client/run-history/index.js';
	import { ExchangeRunnerPanel } from '$lib/components/interop/exchange-runner/index.js';
	import {
		RequirementStatusRow,
		stepStateToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import {
		combinationFor,
		exchangeRunRecord,
		roleBySlug,
		type ChecklistRunState,
		type RunStateDerivation,
		type StepRunState,
		workflowBySlug
	} from '$lib/interop/index.js';
	import type { ProfileSlug } from '$lib/interop/profile-schema.js';

	// The runnable wallet-acceptance page, parametrized by profile. `profile`
	// is fixed for the lifetime of the route mount, so deriving the
	// combination/step-count/labels as plain consts is correct.
	let { profile = 'vcalm' }: { profile?: ProfileSlug } = $props();

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-acceptance')!;
	const combo = $derived(combinationFor('wallet', 'credential-acceptance', profile)!);
	const stepCount = $derived(combo.checklist.steps.length);

	const isOid4 = $derived(profile === 'oid4');
	const headerLabel = $derived(isOid4 ? 'Live · OID4VCI offer' : 'Live · interaction URL');

	type CreateExchangeBody = {
		exchangeId: string;
		protocols: { iu: string; vcapi: string; lcw?: string; OID4VCI?: string };
	};

	type RunnerError = { message: string; hint?: string };

	// Honest, step-level copy for each requirement row's `<details>` disclosure.
	// The external-wallet flow observes progress at the step level only, so every
	// requirement in a step shares its parent step's status — the copy says so
	// rather than implying a per-requirement guarantee we don't have.
	const stepDetailCopy: Record<StepRunState, string | undefined> = {
		pending:
			'Waiting for the wallet to reach this step. Progress is tracked per step, so all of this step’s requirements share its status.',
		'in-flight':
			'The wallet is working through this step. Progress is tracked per step, so all of this step’s requirements share its status.',
		complete: undefined,
		failed: 'The exchange ended in an invalid state at this step.',
		skipped: 'The run errored before reaching this step.'
	};

	/** Step-derived status view for every requirement in the step at `stepIndex`. */
	function requirementStatusForStep(stepIndex: number) {
		const state = perStep[stepIndex] ?? 'pending';
		return stepStateToRequirementStatus(state, { message: stepDetailCopy[state] });
	}

	let exchangeId = $state<string | undefined>(undefined);
	// The single protocol link this profile presents (VCALM `iu` or the OID4VCI deep link).
	let interactionUrl = $state<string | undefined>(undefined);
	let runState = $state<ChecklistRunState>('idle');
	// Seeded once from the fixed-per-mount step count; thereafter mutated by polling.
	let perStep = $state<StepRunState[]>(
		untrack(() => Array.from({ length: stepCount }, () => 'pending'))
	);
	let runnerError = $state<RunnerError | undefined>(undefined);

	let pollHandle: { stop: () => void } | undefined;

	// Run-history recording: record exactly once when a run reaches a terminal
	// state (complete → passed, error/timeout → failed). Reset per run.
	let recorded = false;
	let lastExchangeState: 'pending' | 'active' | 'complete' | 'invalid' = 'pending';

	function recordWalletRun(
		exchangeState: 'pending' | 'active' | 'complete' | 'invalid',
		derived: RunStateDerivation
	) {
		if (recorded) return;
		recorded = true;
		recordRun(
			exchangeRunRecord({
				role: 'wallet',
				workflow: 'credential-acceptance',
				profile,
				exchangeId,
				exchangeState,
				derived
			})
		);
	}

	function setIdle() {
		exchangeId = undefined;
		interactionUrl = undefined;
		runState = 'idle';
		perStep = Array.from({ length: stepCount }, () => 'pending');
		runnerError = undefined;
		recorded = false;
		lastExchangeState = 'pending';
		pollHandle?.stop();
		pollHandle = undefined;
	}

	/**
	 * Create a fresh exchange against the transaction service. Returns the
	 * `{ exchangeId, protocols }` body on success; on HTTP/network failure it
	 * sets the error affordance and returns `undefined`.
	 */
	async function createExchange(): Promise<CreateExchangeBody | undefined> {
		const res = await fetch('/api/exchange-runner/create', { method: 'POST' });
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

	function setError(error: RunnerError) {
		runState = 'error';
		runnerError = error;
		perStep = Array.from({ length: stepCount }, () => 'skipped');
		recordWalletRun(lastExchangeState, { run: 'error', perStep });
	}

	function startPolling(id: string) {
		pollHandle?.stop();
		pollHandle = pollExchange(
			id,
			{
				onUpdate: (response: ExchangePollResponse) => {
					runState = response.derived.run;
					perStep = response.derived.perStep;
					lastExchangeState = response.exchange.state;
					if (response.derived.run === 'complete' || response.derived.run === 'error') {
						recordWalletRun(response.exchange.state, response.derived);
					}
				},
				onError: (e: ExchangePollError) => {
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
						message: 'No response from the wallet within the 5-minute window.',
						hint: 'Generate a new exchange and try again.'
					});
				}
			},
			{ stepCount }
		);
	}

	async function initiate() {
		runnerError = undefined;
		recorded = false;
		lastExchangeState = 'pending';
		try {
			const data = await createExchange();
			if (!data) return;
			exchangeId = data.exchangeId;
			if (isOid4) {
				if (!data.protocols.OID4VCI) {
					setError({
						message: 'The transaction service did not return an OID4VCI credential offer.',
						hint: 'Point TRANSACTION_SERVICE_URL at an OID4VCI-capable transaction service (e.g. the local feature/oid4vp build).'
					});
					return;
				}
				interactionUrl = data.protocols.OID4VCI;
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
		run: runState,
		perStep,
		interactionUrl,
		headerLabel,
		exchangeId,
		error: runnerError
	});
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
		<ExchangeRunnerPanel
			data={panelData}
			actions={{
				onInitiate: initiate,
				onRetry: initiate,
				onReset: setIdle
			}}
		/>
	{/snippet}
	{#snippet requirementState({ requirement, stepIndex })}
		<RequirementStatusRow {requirement} status={requirementStatusForStep(stepIndex)} />
	{/snippet}
</RunnableChecklist>
