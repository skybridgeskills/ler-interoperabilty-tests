<script lang="ts">
	import { onDestroy } from 'svelte';

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

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-acceptance')!;
	const combo = combinationFor('wallet', 'credential-acceptance', 'vcalm')!;
	const stepCount = combo.checklist.steps.length;

	type CreateExchangeBody = {
		exchangeId: string;
		protocols: { iu: string; vcapi: string; lcw?: string; OID4VCI?: string };
	};

	type RunnerError = { message: string; hint?: string };

	let exchangeId = $state<string | undefined>(undefined);
	let interactionUrl = $state<string | undefined>(undefined);
	let oid4vciDeepLink = $state<string | undefined>(undefined);
	let selectedProtocol = $state<ExchangeProtocolId>('vcalm');
	let runState = $state<ChecklistRunState>('idle');
	let perStep = $state<StepRunState[]>(Array.from({ length: stepCount }, () => 'pending'));
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
				profile: 'vcalm',
				exchangeId,
				exchangeState,
				derived
			})
		);
	}

	function setIdle() {
		exchangeId = undefined;
		interactionUrl = undefined;
		oid4vciDeepLink = undefined;
		selectedProtocol = 'vcalm';
		runState = 'idle';
		perStep = Array.from({ length: stepCount }, () => 'pending');
		runnerError = undefined;
		recorded = false;
		lastExchangeState = 'pending';
		pollHandle?.stop();
		pollHandle = undefined;
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
			const res = await fetch('/api/exchange-runner/create', { method: 'POST' });
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as RunnerError;
				setError({
					message: body.message ?? `Initiate responded ${res.status}`,
					hint: body.hint ?? 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
				});
				return;
			}
			const data = (await res.json()) as CreateExchangeBody;
			exchangeId = data.exchangeId;
			interactionUrl = data.protocols.iu;
			oid4vciDeepLink = data.protocols.OID4VCI;
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
		oid4vciDeepLink,
		selectedProtocol,
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
				onReset: setIdle,
				onSelectProtocol: (next) => {
					selectedProtocol = next;
				}
			}}
		/>
	{/snippet}
</RunnableChecklist>
