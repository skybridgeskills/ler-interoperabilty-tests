import { attachExchange, pollExchange } from '$lib/client/exchange-runner/index.js';
import type { ExchangeProtocolId } from '$lib/components/interop/exchange-runner/index.js';
import type { RunnerWorkflowId } from '$lib/interop/runner-state.js';
import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import { baseProfileOf, type Scenario, type ScenarioStep } from '$lib/interop/scenarios/index.js';

/** The error affordance shape `ExchangeRunnerPanel` already renders. */
export type RunnerError = { message: string; hint?: string };

/** What a live step is showing while it waits for the wallet. */
export type StepLink = { exchangeId: string; interactionUrl: string };

export type ExchangeStepCallbacks = {
	/** The one protocol link this step presents, as soon as it exists. */
	onLink: (link: StepLink) => void;
	/** The step reached `complete`; its evidence is ready for `settleStep`. */
	onSettled: (evidence: StepEvidence) => void;
	/** The harness failed. The run becomes unrecordable — see D2. */
	onFailed: (error: RunnerError) => void;
};

const SERVICES_HINT = 'Run `pnpm turbo dev:full` to start the local DCC dependency services.';
const LOGS_HINT = 'Check the transaction service logs (`docker logs lits-transaction-service`).';

/**
 * Which wire field of the protocols object a scenario presents, and under which
 * workflow — decided by the scenario's base profile and the step's action kind.
 *
 * A scenario knows its own protocol, which is why the route does not have to
 * thread one through the URL.
 */
export function transportFor(
	scenario: Scenario,
	step: ScenarioStep
): { link: 'iu' | 'OID4VCI' | 'OID4VP'; workflow: RunnerWorkflowId; protocol: ExchangeProtocolId } {
	const verifying = step.action?.kind === 'request-presentation';
	const workflow: RunnerWorkflowId = verifying ? 'verify' : 'claim';
	if (baseProfileOf(scenario.memberships) !== 'oid4') {
		return { link: 'iu', workflow, protocol: 'vcalm' };
	}
	return verifying
		? { link: 'OID4VP', workflow, protocol: 'oid4vp' }
		: { link: 'OID4VCI', workflow, protocol: 'oid4vci' };
}

type CreateExchangeBody = {
	exchangeId: string;
	protocols: Partial<Record<'iu' | 'OID4VCI' | 'OID4VP', string>>;
};

/**
 * Mint the exchange a step's action calls for, present its link, and poll until
 * it settles.
 *
 * `pollExchange` is reused **unchanged** with `stepCount: 1`: a scenario step is
 * exactly one exchange lifecycle, so `derived.run` is the step's own state and
 * `response.exchange` is the evidence record.
 *
 * Returns a handle whose `stop()` tears the poller down. The caller must call it
 * before starting another step and on destroy.
 */
export function startExchangeStep(
	scenario: Scenario,
	step: ScenarioStep,
	callbacks: ExchangeStepCallbacks
): { stop: () => void } {
	const { link, workflow } = transportFor(scenario, step);
	let handle: { stop: () => void } | undefined;
	let stopped = false;

	const stop = () => {
		stopped = true;
		handle?.stop();
		handle = undefined;
	};

	void (async () => {
		const created = await createExchange(scenario, step, callbacks.onFailed);
		if (!created || stopped) return;

		const interactionUrl = created.protocols[link];
		if (!interactionUrl) {
			callbacks.onFailed({
				message: `The transaction service did not return a ${link} link for this exchange.`,
				hint: 'Point TRANSACTION_SERVICE_URL at a transaction service that speaks this profile.'
			});
			return;
		}

		callbacks.onLink({ exchangeId: created.exchangeId, interactionUrl });
		handle = poll(created.exchangeId, step.id, workflow, callbacks);
	})();

	return { stop };
}

/**
 * Attach mode: adopt an externally-minted exchange into a step instead of
 * minting one. Offers no path to minting, matching the runnable pages.
 */
export function attachExchangeStep(
	scenario: Scenario,
	step: ScenarioStep,
	exchangeId: string,
	callbacks: ExchangeStepCallbacks
): { stop: () => void } {
	const { link, workflow } = transportFor(scenario, step);
	let handle: { stop: () => void } | undefined;
	let stopped = false;

	void (async () => {
		const result = await attachExchange({ exchangeId, workflow, link });
		if (stopped) return;
		if (!result.ok) {
			callbacks.onFailed(result.error);
			return;
		}
		callbacks.onLink({ exchangeId: result.exchangeId, interactionUrl: result.interactionUrl });
		handle = poll(result.exchangeId, step.id, workflow, callbacks);
	})();

	return {
		stop: () => {
			stopped = true;
			handle?.stop();
			handle = undefined;
		}
	};
}

async function createExchange(
	scenario: Scenario,
	step: ScenarioStep,
	onFailed: (error: RunnerError) => void
): Promise<CreateExchangeBody | undefined> {
	const action = step.action;
	if (!action || action.kind === 'deliver-direct' || action.kind === 'present-to-verifier') {
		onFailed({ message: `Step "${step.id}" has no exchange to create.` });
		return undefined;
	}

	// `exchangeIdPrefix` is the scenario slug, so a run is findable in the
	// exchange journal without cross-referencing anything.
	const body =
		action.kind === 'issue'
			? { ...action, exchangeIdPrefix: scenario.slug }
			: { kind: action.kind, request: action.request };

	try {
		const res = await fetch('/api/exchange-runner/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			const failure = (await res.json().catch(() => ({}))) as Partial<RunnerError>;
			onFailed({
				message: failure.message ?? `Initiate responded ${res.status}`,
				hint: failure.hint ?? SERVICES_HINT
			});
			return undefined;
		}
		return (await res.json()) as CreateExchangeBody;
	} catch (e) {
		onFailed({ message: e instanceof Error ? e.message : String(e), hint: SERVICES_HINT });
		return undefined;
	}
}

function poll(
	exchangeId: string,
	stepId: string,
	workflow: RunnerWorkflowId,
	callbacks: ExchangeStepCallbacks
): { stop: () => void } {
	return pollExchange(
		exchangeId,
		{
			onUpdate: ({ exchange, derived }) => {
				if (derived.run === 'complete') callbacks.onSettled({ stepId, exchange });
				else if (derived.run === 'error') {
					callbacks.onFailed({
						message: 'The exchange ended in an invalid state.',
						hint: LOGS_HINT
					});
				}
			},
			onError: (e) =>
				callbacks.onFailed({
					message:
						e.kind === 'http-error' ? `Polling responded ${e.status ?? '<no status>'}` : e.message,
					hint: LOGS_HINT
				}),
			onTimeout: () =>
				callbacks.onFailed({
					message: 'No response from the wallet within the 5-minute window.',
					hint: 'Start over to mint a fresh exchange.'
				})
		},
		{ stepCount: 1, workflow }
	);
}
