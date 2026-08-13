<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';

	import {
		attachExchange,
		pollExchange,
		type ExchangePollError,
		type ExchangePollResponse
	} from '$lib/client/exchange-runner/index.js';
	import {
		ExchangeRunnerPanel,
		type ExchangeProtocolId
	} from '$lib/components/interop/exchange-runner/index.js';
	import { statusesFromStepStates } from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunnableChecklist,
		RunStateBadge
	} from '$lib/components/interop/runnable-checklist/index.js';
	import {
		combinationFor,
		roleBySlug,
		type ChecklistRunState,
		type RunnerWorkflowId,
		type StepRunState,
		workflowBySlug
	} from '$lib/interop/index.js';
	import type { ProfileSlug } from '$lib/interop/profile-schema.js';

	// The runnable wallet-acceptance page, parametrized by profile. `profile`
	// is fixed for the lifetime of the route mount, so deriving the
	// combination/step-count/labels as plain consts is correct.
	//
	// `attachExchangeId` switches the page into attach mode: it adopts an
	// exchange minted outside the suite (the probe CLI) instead of minting one,
	// and offers no path to minting while it does. The route reads it off the URL
	// and passes it in — this component stays parameterised for Storybook.
	let {
		profile = 'vcalm',
		attachExchangeId = undefined,
		attachWorkflow = undefined
	}: {
		profile?: ProfileSlug;
		attachExchangeId?: string;
		attachWorkflow?: RunnerWorkflowId;
	} = $props();

	const attached = $derived(attachExchangeId !== undefined);
	/** The workflow this page's exchange lives under; issuance unless told otherwise. */
	const workflowId = $derived<RunnerWorkflowId>(attachWorkflow ?? 'claim');

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-acceptance')!;
	const combo = $derived(combinationFor('wallet', 'credential-acceptance', profile)!);
	const stepCount = $derived(combo.checklist.steps.length);

	const isOid4 = $derived(profile === 'oid4');
	// The panel derives its QR header label from this protocol id.
	const protocol = $derived<ExchangeProtocolId>(isOid4 ? 'oid4vci' : 'vcalm');

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
		pending: undefined,
		'in-flight':
			'The wallet is working through this step. Progress is tracked per step, so all of this step’s requirements share its status.',
		complete: undefined,
		failed: 'The exchange ended in an invalid state at this step.',
		skipped: 'The run errored before reaching this step.'
	};

	/** Per-step disclosure copy, in the `{ message }` shape `statusesFromStepStates` expects. */
	const detailFor = (state: StepRunState) => ({ message: stepDetailCopy[state] });

	let exchangeId = $state<string | undefined>(undefined);
	// The single protocol link this profile presents (VCALM `iu` or the OID4VCI deep link).
	let interactionUrl = $state<string | undefined>(undefined);
	let runState = $state<ChecklistRunState>('idle');
	// Seeded once from the fixed-per-mount step count; thereafter mutated by polling.
	let perStep = $state<StepRunState[]>(
		untrack(() => Array.from({ length: stepCount }, () => 'pending'))
	);
	let runnerError = $state<RunnerError | undefined>(undefined);

	// Presentation-ready per-requirement statuses (keyed by requirement id). Rendered live
	// only — this page no longer persists anything (see the run-store note below).
	const statuses = $derived(statusesFromStepStates(combo.checklist.steps, perStep, detailFor));

	let pollHandle: { stop: () => void } | undefined;

	// This page records nothing. The scenario run store replaced the combination-keyed
	// one, and this page is not a scenario yet — it still drives a real exchange and
	// still shows live per-step status, it just does not persist. It is deleted once
	// its combination migrates.

	/** Step 1 in flight, the rest pending — the shape a run starts in. */
	function seedPerStep(): StepRunState[] {
		const rest: StepRunState[] = Array.from({ length: stepCount - 1 }, () => 'pending');
		return ['in-flight', ...rest];
	}

	function setIdle() {
		exchangeId = undefined;
		interactionUrl = undefined;
		runState = 'idle';
		perStep = Array.from({ length: stepCount }, () => 'pending');
		runnerError = undefined;
		pollHandle?.stop();
		pollHandle = undefined;
	}

	/**
	 * Create a fresh exchange against the transaction service. Returns the
	 * `{ exchangeId, protocols }` body on success; on HTTP/network failure it
	 * sets the error affordance and returns `undefined`.
	 */
	async function createExchange(): Promise<CreateExchangeBody | undefined> {
		// The create endpoint takes a scenario action. This page predates scenarios,
		// so it names the recipe its hardcoded template became.
		const res = await fetch('/api/exchange-runner/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind: 'issue', credential: 'minimal-ob3' })
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

	function setError(error: RunnerError) {
		runState = 'error';
		runnerError = error;
		perStep = Array.from({ length: stepCount }, () => 'skipped');
	}

	function startPolling(id: string) {
		pollHandle?.stop();
		pollHandle = pollExchange(
			id,
			{
				onUpdate: (response: ExchangePollResponse) => {
					runState = response.derived.run;
					perStep = response.derived.perStep;
				},
				onError: (e: ExchangePollError) => {
					// Belt-and-suspenders: the poller already stops itself on a fatal
					// error, but stop the handle here too so page state can't diverge.
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
						message: 'No response from the wallet within the 5-minute window.',
						hint: 'Generate a new exchange and try again.'
					});
				}
			},
			{ stepCount, workflow: workflowId }
		);
	}

	/**
	 * Attach mode: adopt the exchange named in the route's `?exchangeId=`. Reads
	 * its protocols and starts polling exactly as a minted run would — it never
	 * creates an exchange, and there is no affordance here that could.
	 */
	async function attach(id: string) {
		const result = await attachExchange({
			exchangeId: id,
			workflow: workflowId,
			link: isOid4 ? 'OID4VCI' : 'iu'
		});
		if (!result.ok) {
			setError(result.error);
			return;
		}
		exchangeId = result.exchangeId;
		interactionUrl = result.interactionUrl;
		runState = 'awaiting-wallet';
		perStep = seedPerStep();
		startPolling(result.exchangeId);
	}

	async function initiate() {
		runnerError = undefined;
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
			perStep = seedPerStep();
			startPolling(data.exchangeId);
		} catch (e) {
			setError({
				message: e instanceof Error ? e.message : String(e),
				hint: 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
			});
		}
	}

	onMount(() => {
		if (attachExchangeId) void attach(attachExchangeId);
	});

	onDestroy(() => {
		pollHandle?.stop();
		pollHandle = undefined;
	});

	const panelData = $derived({
		intent: 'issuance' as const,
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
		<!--
			Attach mode passes no actions at all: minting, retrying (which mints)
			and resetting (whose only exit is minting) are all unavailable when the
			exchange came from outside the suite. The panel says so in place of the
			idle CTA.
		-->
		<ExchangeRunnerPanel
			data={panelData}
			actions={attached
				? {}
				: {
						onInitiate: initiate,
						onRetry: initiate,
						onReset: setIdle
					}}
		/>
	{/snippet}
</RunnableChecklist>
