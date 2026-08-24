import { attachExchange, pollExchange } from '$lib/client/exchange-runner/index.js';
import type { ExchangeProtocolId } from '$lib/components/interop/exchange-runner/index.js';
import type { RunnerExchangeView, RunnerWorkflowId } from '$lib/interop/runner-state.js';
import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import { baseProfileOf, type Scenario, type ScenarioStep } from '$lib/interop/scenarios/index.js';

/** The error affordance shape `ExchangeRunnerPanel` already renders. */
export type RunnerError = { message: string; hint?: string };

/** What a live step is showing while it waits for the wallet. */
export type StepLink = { exchangeId: string; interactionUrl: string };

export type ExchangeStepCallbacks = {
	/** The one protocol link this step presents, as soon as it exists. */
	onLink: (link: StepLink) => void;
	/**
	 * The step's exchange reached a **terminal** state — `complete` or `invalid`.
	 * Its evidence is ready for `settleStep`; the checks decide what the state
	 * means.
	 */
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
	if (
		!action ||
		action.kind === 'deliver-direct' ||
		action.kind === 'present-to-verifier' ||
		action.kind === 'receive-from-issuer'
	) {
		onFailed({ message: `Step "${step.id}" has no exchange to create.` });
		return undefined;
	}

	// `exchangeIdPrefix` is the scenario slug, so a run is findable in the
	// exchange journal without cross-referencing anything.
	//
	// A verify action forwards its conduct fields too — spread from the action
	// rather than listed, so an optional one absent on the action stays absent on
	// the wire. Presence in the stored `exchange.variables` is what the
	// `*-recorded` checks read, so an explicit `undefined` would muddy it.
	const body =
		action.kind === 'issue' ? { ...action, exchangeIdPrefix: scenario.slug } : { ...action };

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
				// A TERMINAL exchange is evidence, not a harness failure. `invalid` is a
				// real observation — a presentation whose proof did not verify, a claim
				// the service refused — and the checks are what decide what it means;
				// `exchange-reached-complete` already fails on a non-`complete` state.
				// Treating it as a harness failure made the run unrecordable and lost
				// the measurement, which is the opposite of what the scenario is for.
				// The legacy pages never did this: the wallet-presentation scorer's
				// settled set is `{complete, invalid}` deliberately (see the black-box
				// scoring ADR, "Settle-gated scoring").
				//
				// `onFailed` keeps the failures of the HARNESS — create failed, the poll
				// errored, the window timed out — because those leave nothing honest to
				// record.
				if (derived.run === 'complete' || derived.run === 'error') {
					callbacks.onSettled(stepEvidenceFrom(stepId, exchange));
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

/**
 * The evidence a settled exchange step produced.
 *
 * `artifact` is "what actually moved". On a **claim** exchange that is the
 * issued credential, which the transaction service persists to
 * `variables.results.default.verifiableCredential[0]`; putting it here is what
 * lets the transport-independent `credential-*` checks — written for the issuer
 * scenarios, which read the credential off `artifact` — serve a wallet
 * acceptance scenario unchanged.
 *
 * A **verify** exchange moves a presentation instead, and the presentation
 * checks read `results.default` off the exchange record directly. Nothing is
 * written here for it on purpose: two places to look for one fact is the
 * duplication the issuer migration merged away.
 */
function stepEvidenceFrom(stepId: string, exchange: RunnerExchangeView): StepEvidence {
	const issued = issuedCredentialOf(exchange);
	return { stepId, exchange, ...(issued !== undefined ? { artifact: issued } : {}) };
}

/**
 * The credential a claim exchange delivered, or `undefined`.
 *
 * Narrows at every hop and **never throws**: a half-populated exchange is a
 * normal state (a verify exchange has no `verifiableCredential` at all, and an
 * `invalid` claim may have settled before signing), not an error.
 */
function issuedCredentialOf(exchange: RunnerExchangeView): unknown {
	const results = exchange.variables?.results;
	if (!results || typeof results !== 'object') return undefined;
	const settled = (results as { default?: unknown }).default;
	if (!settled || typeof settled !== 'object') return undefined;
	const delivered = (settled as { verifiableCredential?: unknown }).verifiableCredential;
	const first: unknown = Array.isArray(delivered) ? delivered[0] : delivered;
	return first && typeof first === 'object' ? first : undefined;
}
