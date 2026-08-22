import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import type { Scenario, ScenarioStep } from '$lib/interop/scenarios/index.js';

import { type RunnerError, startExchangeStep } from './exchange-step.js';

/**
 * What a settled exchange step records, and when.
 *
 * Two behaviours are under test, and both are corrections rather than new
 * features:
 *
 * 1. **A terminal exchange is evidence, not a harness failure.** `invalid` used
 *    to route to `onFailed`, whose contract makes the run unrecordable — so a
 *    wallet presenting an unverifiable VP lost the measurement instead of
 *    failing the requirement that exists to catch it. `onFailed` is now reserved
 *    for failures of the harness.
 * 2. **The issued credential rides `StepEvidence.artifact`.** The transaction
 *    service persists it to `variables.results.default.verifiableCredential[0]`;
 *    putting it on `artifact` is what lets the transport-independent
 *    `credential-*` checks serve a wallet acceptance scenario unchanged.
 */

const scenario = {
	slug: 'test-scenario',
	memberships: [{ profile: 'oid4', level: 'required' }]
} as unknown as Scenario;

const step = {
	id: 'offer',
	title: 'Offer',
	summary: '',
	action: { kind: 'issue', credential: 'minimal-ob3' },
	requirements: []
} as unknown as ScenarioStep;

const CREDENTIAL = {
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	proof: { type: 'DataIntegrityProof', cryptosuite: 'ecdsa-rdfc-2019' }
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
	vi.restoreAllMocks();
});

/**
 * Stub create + the first poll. `pollExchange` fires its first tick
 * immediately, so one poll response is enough to drive a settle.
 */
function stubExchange(poll: { state: string; variables?: Record<string, unknown> }, run: string) {
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (url.includes('/create')) {
			return jsonResponse({
				exchangeId: 'x-1',
				protocols: { OID4VCI: 'openid-credential-offer://?credential_offer_uri=x' }
			});
		}
		return jsonResponse({ exchange: poll, derived: { run, perStep: [run] } });
	}) as typeof fetch;
}

/** Resolve once one of the callbacks fires, so the async mint can settle. */
function drive(): {
	settled: Promise<StepEvidence>;
	failed: Promise<RunnerError>;
	handle: { stop: () => void };
} {
	let onSettled!: (e: StepEvidence) => void;
	let onFailed!: (e: RunnerError) => void;
	const settled = new Promise<StepEvidence>((r) => (onSettled = r));
	const failed = new Promise<RunnerError>((r) => (onFailed = r));
	const handle = startExchangeStep(scenario, step, { onLink: () => {}, onSettled, onFailed });
	return { settled, failed, handle };
}

describe('a settled exchange step', () => {
	it('settles on `complete`, carrying the exchange as evidence', async () => {
		stubExchange({ state: 'complete', variables: {} }, 'complete');
		const { settled, handle } = drive();

		const evidence = await settled;
		expect(evidence.stepId).toBe('offer');
		expect(evidence.exchange?.state).toBe('complete');
		handle.stop();
	});

	it('settles on `invalid` too — a terminal exchange is a measurement', async () => {
		stubExchange({ state: 'invalid', variables: {} }, 'error');
		const { settled, failed, handle } = drive();

		// The race is the assertion: if `invalid` still routed to `onFailed` the
		// run would be unrecordable and this would resolve to the failure branch.
		const outcome = await Promise.race([
			settled.then((e) => ({ kind: 'settled' as const, e })),
			failed.then((e) => ({ kind: 'failed' as const, e }))
		]);

		expect(outcome.kind).toBe('settled');
		if (outcome.kind === 'settled') {
			expect(outcome.e.exchange?.state).toBe('invalid');
		}
		handle.stop();
	});

	it('puts the issued credential on `artifact`', async () => {
		stubExchange(
			{
				state: 'complete',
				variables: { results: { default: { verifiableCredential: [CREDENTIAL] } } }
			},
			'complete'
		);
		const { settled, handle } = drive();

		expect((await settled).artifact).toEqual(CREDENTIAL);
		handle.stop();
	});

	it('reads a single (non-array) `verifiableCredential` too', async () => {
		stubExchange(
			{
				state: 'complete',
				variables: { results: { default: { verifiableCredential: CREDENTIAL } } }
			},
			'complete'
		);
		const { settled, handle } = drive();

		expect((await settled).artifact).toEqual(CREDENTIAL);
		handle.stop();
	});

	it('leaves `artifact` absent when the exchange delivered nothing', async () => {
		// A verify exchange has no `verifiableCredential` at all, and an `invalid`
		// claim may settle before signing. Absent, not `null` and not `{}`, so a
		// check reading it sees "this step produced no credential".
		stubExchange({ state: 'complete', variables: { results: { default: {} } } }, 'complete');
		const { settled, handle } = drive();

		const evidence = await settled;
		expect('artifact' in evidence).toBe(false);
		handle.stop();
	});

	it('never throws on a half-populated exchange', async () => {
		stubExchange({ state: 'complete', variables: { results: 'not-an-object' } }, 'complete');
		const { settled, handle } = drive();

		expect((await settled).artifact).toBeUndefined();
		handle.stop();
	});

	it('still routes a poll HTTP error to `onFailed` — that is a harness failure', async () => {
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (url.includes('/create')) {
				return jsonResponse({ exchangeId: 'x-1', protocols: { OID4VCI: 'openid://x' } });
			}
			return jsonResponse({ code: 502 }, 502);
		}) as typeof fetch;

		const { failed, handle } = drive();
		expect((await failed).message).toContain('502');
		handle.stop();
	});

	it('still routes a create failure to `onFailed`', async () => {
		globalThis.fetch = (async () =>
			jsonResponse({ code: 503, message: 'Exchange runner disabled' }, 503)) as typeof fetch;

		const { failed, handle } = drive();
		expect((await failed).message).toBe('Exchange runner disabled');
		handle.stop();
	});
});
