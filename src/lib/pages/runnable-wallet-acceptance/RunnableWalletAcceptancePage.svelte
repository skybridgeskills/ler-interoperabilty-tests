<script lang="ts">
	import { onDestroy, untrack } from 'svelte';

	import {
		pollExchange,
		type ExchangePollError,
		type ExchangePollResponse
	} from '$lib/client/exchange-runner/index.js';
	import { recordRun } from '$lib/client/run-history/index.js';
	import { ExchangeRunnerPanel } from '$lib/components/interop/exchange-runner/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import {
		combinationFor,
		exchangeRunRecord,
		roleBySlug,
		type ChecklistRunState,
		type RunStateDerivation,
		type StepRunState,
		walletRunRecord,
		workflowBySlug
	} from '$lib/interop/index.js';
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import { TestWalletPanel } from './test-wallet-panel/index.js';

	// The runnable wallet-acceptance page, parametrized by profile. `profile`
	// is fixed for the lifetime of the route mount, so deriving the
	// combination/step-count/labels as plain consts is correct.
	let { profile = 'vcalm' }: { profile?: 'vcalm' | 'oid4' } = $props();

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-acceptance')!;
	const combo = $derived(combinationFor('wallet', 'credential-acceptance', profile)!);
	const stepCount = $derived(combo.checklist.steps.length);

	const isOid4 = $derived(profile === 'oid4');
	const headerLabel = $derived(isOid4 ? 'Live · OID4VCI offer' : 'Live · interaction URL');

	// The built-in test wallet has VCALM (M3) and OID4VCI (M4) acceptance drivers.
	const canRunTestWallet = $derived(profile === 'vcalm' || profile === 'oid4');
	const testWalletProtocol = $derived(isOid4 ? 'OID4VCI' : 'VCALM');

	type CreateExchangeBody = {
		exchangeId: string;
		protocols: { iu: string; vcapi: string; lcw?: string; OID4VCI?: string };
	};

	type RunnerError = { message: string; hint?: string };

	/** Response shape of `POST /api/wallet-runner/accept`. */
	type WalletAcceptResponse = {
		exchange: { state: 'pending' | 'active' | 'complete' | 'invalid' };
		verify: { verified: boolean; errors?: string[] };
		report: IssuerRunnerReport;
		failingMustCount: number;
	};

	let exchangeId = $state<string | undefined>(undefined);
	// The single protocol link this profile presents (VCALM `iu` or the OID4VCI deep link).
	let interactionUrl = $state<string | undefined>(undefined);
	let runState = $state<ChecklistRunState>('idle');
	// Seeded once from the fixed-per-mount step count; thereafter mutated by polling.
	let perStep = $state<StepRunState[]>(
		untrack(() => Array.from({ length: stepCount }, () => 'pending'))
	);
	let runnerError = $state<RunnerError | undefined>(undefined);

	// Built-in test-wallet run state (VCALM only). `testWalletReport` is the
	// conformance report from the last completed accept call; `testWalletBusy`
	// guards against concurrent runs.
	let testWalletReport = $state<IssuerRunnerReport | undefined>(undefined);
	let testWalletBusy = $state(false);

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
		testWalletReport = undefined;
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
		testWalletReport = undefined;
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

	/**
	 * Run the suite's built-in test wallet (VCALM only). Creates an exchange if
	 * one isn't already in flight, drives the holder flow server-side via
	 * `POST /api/wallet-runner/accept`, then renders the conformance report and
	 * records the run. Stops any external-wallet polling first so the two paths
	 * don't both write run history for the same exchange.
	 */
	async function runTestWallet() {
		if (testWalletBusy || !canRunTestWallet) return;
		testWalletBusy = true;
		pollHandle?.stop();
		pollHandle = undefined;
		runnerError = undefined;
		testWalletReport = undefined;
		recorded = false;
		lastExchangeState = 'pending';
		try {
			const data = await createExchange();
			if (!data) return;
			exchangeId = data.exchangeId;
			interactionUrl = undefined;

			const res = await fetch('/api/wallet-runner/accept', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					profile,
					exchange: { exchangeId: data.exchangeId, protocols: data.protocols }
				})
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as RunnerError;
				setError({
					message: body.message ?? `Test wallet responded ${res.status}`,
					hint: body.hint ?? 'Check the wallet-runner logs and the transaction service.'
				});
				return;
			}

			const result = (await res.json()) as WalletAcceptResponse;
			lastExchangeState = result.exchange.state;
			testWalletReport = result.report;

			const passed = result.report.verified && result.exchange.state === 'complete';
			runState = passed ? 'complete' : 'error';
			perStep = Array.from({ length: stepCount }, () => (passed ? 'complete' : 'skipped'));
			runnerError = passed
				? undefined
				: {
						message: `${result.failingMustCount} MUST requirement${
							result.failingMustCount === 1 ? '' : 's'
						} failed.`,
						hint: 'See the conformance report below for details.'
					};

			recorded = true;
			recordRun(
				walletRunRecord({
					role: 'wallet',
					workflow: 'credential-acceptance',
					profile,
					verified: result.report.verified,
					failingMustCount: result.failingMustCount,
					exchangeId: data.exchangeId,
					exchangeState: result.exchange.state
				})
			);
		} catch (e) {
			setError({
				message: e instanceof Error ? e.message : String(e),
				hint: 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
			});
		} finally {
			testWalletBusy = false;
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
		{#if canRunTestWallet}
			<TestWalletPanel
				report={testWalletReport}
				busy={testWalletBusy}
				protocol={testWalletProtocol}
				onRun={runTestWallet}
			/>
		{/if}
	{/snippet}
</RunnableChecklist>
