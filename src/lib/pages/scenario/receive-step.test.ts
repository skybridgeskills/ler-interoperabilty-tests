import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import type { ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';
import { startReceiveStep } from './receive-step.js';

const step = {
	id: 'receive',
	title: 'Receive',
	summary: '',
	action: { kind: 'receive-from-issuer', transport: 'vcalm', keyProofSuite: 'eddsa-rdfc-2022' },
	requirements: []
} as unknown as ScenarioStep;

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

/** Resolve once one of the callbacks fires, so the async receive can settle. */
function drive(target: ScenarioStep = step): {
	settled: Promise<StepEvidence>;
	missed: Promise<string>;
	failed: Promise<RunnerError>;
	handle: ReturnType<typeof startReceiveStep>;
} {
	let onSettled!: (e: StepEvidence) => void;
	let onMiss!: (n: string) => void;
	let onFailed!: (e: RunnerError) => void;
	const settled = new Promise<StepEvidence>((r) => (onSettled = r));
	const missed = new Promise<string>((r) => (onMiss = r));
	const failed = new Promise<RunnerError>((r) => (onFailed = r));
	const handle = startReceiveStep(target, { onSettled, onMiss, onFailed });
	return { settled, missed, failed, handle };
}

const FLOW = { transport: 'vcalm', verified: true, interactionFetched: true };
const CREDENTIAL = { type: ['VerifiableCredential', 'OpenBadgeCredential'] };

describe('startReceiveStep', () => {
	it('settles with the credential on `artifact` and the wire facts on `issuerFlow`', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({ flow: FLOW, credential: CREDENTIAL, delivered: true })
		) as typeof fetch;

		const { settled, handle } = drive();
		handle.receive('https://issuer.test/exchanges/ex-1');

		const evidence = await settled;
		expect(evidence.stepId).toBe('receive');
		expect(evidence.artifact).toEqual(CREDENTIAL);
		expect(evidence.issuerFlow).toMatchObject({ transport: 'vcalm', verified: true });
		expect(evidence.transport).toMatchObject({ delivered: true });
	});

	it('posts the action’s transport and key-proof suite', async () => {
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			void _url;
			void init;
			return jsonResponse({ flow: FLOW, credential: CREDENTIAL, delivered: true });
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const { settled, handle } = drive();
		handle.receive('https://issuer.test/exchanges/ex-1');
		await settled;

		const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
		expect(body).toMatchObject({
			transport: 'vcalm',
			keyProofSuite: 'eddsa-rdfc-2022',
			input: 'https://issuer.test/exchanges/ex-1'
		});
	});

	it('misses (and stays in-flight) when nothing was delivered', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({
				flow: { transport: 'vcalm', verified: false },
				delivered: false,
				error: { message: 'The exchange delivered no credential.' }
			})
		) as typeof fetch;

		const { missed, handle } = drive();
		handle.receive('https://issuer.test/exchanges/miss');

		expect(await missed).toMatch(/no credential/i);
	});

	it('fails when the route responds non-2xx', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({ message: 'Paste the interaction URL from your issuer.' }, 400)
		) as typeof fetch;

		const { failed, handle } = drive();
		handle.receive('   ');

		expect((await failed).message).toMatch(/paste the interaction url/i);
	});

	it('fails when fetch throws', async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new Error('network down');
		}) as typeof fetch;

		const { failed, handle } = drive();
		handle.receive('https://issuer.test/exchanges/ex-1');

		expect((await failed).message).toBe('network down');
	});

	it('fails when the step is not a receive-from-issuer step', async () => {
		const wrong = { ...step, action: { kind: 'deliver-direct' } } as unknown as ScenarioStep;
		const { failed, handle } = drive(wrong);
		handle.receive('anything');

		expect((await failed).message).toMatch(/not a receive-from-issuer step/i);
	});

	it('drops callbacks after stop()', async () => {
		let settled = false;
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({ flow: FLOW, credential: CREDENTIAL, delivered: true })
		) as typeof fetch;

		const handle = startReceiveStep(step, {
			onSettled: () => (settled = true),
			onMiss: () => {},
			onFailed: () => {}
		});
		handle.receive('https://issuer.test/exchanges/ex-1');
		handle.stop();
		await new Promise((r) => setTimeout(r, 10));

		expect(settled).toBe(false);
	});
});
