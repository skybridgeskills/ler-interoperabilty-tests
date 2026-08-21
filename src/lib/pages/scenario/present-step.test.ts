import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import type { ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';
import { startPresentStep } from './present-step.js';

const step = {
	id: 'present',
	title: 'Present',
	summary: '',
	action: { kind: 'present-to-verifier', credential: 'minimal-ob3', transport: 'vcalm' },
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

/** Resolve once one of the callbacks fires, so the async present can settle. */
function drive(): {
	settled: Promise<StepEvidence>;
	missed: Promise<string>;
	failed: Promise<RunnerError>;
	handle: ReturnType<typeof startPresentStep>;
} {
	let onSettled!: (e: StepEvidence) => void;
	let onMiss!: (n: string) => void;
	let onFailed!: (e: RunnerError) => void;
	const settled = new Promise<StepEvidence>((r) => (onSettled = r));
	const missed = new Promise<string>((r) => (onMiss = r));
	const failed = new Promise<RunnerError>((r) => (onFailed = r));
	const handle = startPresentStep(step, { onSettled, onMiss, onFailed });
	return { settled, missed, failed, handle };
}

const REQUEST = { transport: 'vcalm', vcapiAdvertised: true, vprMatched: true };

describe('startPresentStep', () => {
	it('settles with request + present evidence when the credential submits', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({ request: REQUEST, present: { submitted: true, transportStatus: 200 } })
		) as typeof fetch;

		const { settled, handle } = drive();
		handle.present('https://verifier.test/interactions/ex-1');

		const evidence = await settled;
		expect(evidence.stepId).toBe('present');
		expect(evidence.verifierRequest).toMatchObject({ vcapiAdvertised: true });
		expect(evidence.verifierPresent).toMatchObject({ submitted: true });
	});

	it('stays in-flight and reports a miss when the submission does not land', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({
				request: REQUEST,
				present: { submitted: false, error: { message: 'The exchange rejected it.' } }
			})
		) as typeof fetch;

		const { missed, handle } = drive();
		handle.present('https://verifier.test/interactions/miss');

		expect(await missed).toMatch(/rejected/);
	});

	it('fails when the present route errors', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({ message: 'Could not present the credential.' }, 500)
		) as typeof fetch;

		const { failed, handle } = drive();
		handle.present('https://verifier.test/interactions/ex-1');

		expect((await failed).message).toMatch(/present/i);
	});

	it('fails on a network error', async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new Error('network down');
		}) as typeof fetch;

		const { failed, handle } = drive();
		handle.present('https://verifier.test/interactions/ex-1');

		expect((await failed).message).toMatch(/network down/);
	});
});
