import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import type { ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';
import { type PresentMissEvidence, startPresentStep } from './present-step.js';

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
	missed: Promise<{ note: string; observed: PresentMissEvidence }>;
	failed: Promise<RunnerError>;
	handle: ReturnType<typeof startPresentStep>;
} {
	let onSettled!: (e: StepEvidence) => void;
	let resolveMiss!: (m: { note: string; observed: PresentMissEvidence }) => void;
	let onFailed!: (e: RunnerError) => void;
	const settled = new Promise<StepEvidence>((r) => (onSettled = r));
	const missed = new Promise<{ note: string; observed: PresentMissEvidence }>(
		(r) => (resolveMiss = r)
	);
	const failed = new Promise<RunnerError>((r) => (onFailed = r));
	const onMiss = (note: string, observed: PresentMissEvidence) => resolveMiss({ note, observed });
	const handle = startPresentStep(step, { onSettled, onMiss, onFailed });
	return { settled, missed, failed, handle };
}

/** A present trace ending on a refused submission — the case the panel exists for. */
const TRACE = {
	stages: [
		{
			name: 'interaction',
			label: 'Interaction URL',
			method: 'GET' as const,
			status: 200,
			ok: true
		},
		{
			name: 'submission',
			label: 'Presentation submission',
			method: 'POST' as const,
			status: 409,
			ok: false,
			body: { error: 'exchange already complete' },
			error: 'The exchange rejected it.'
		}
	]
};

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
		expect(evidence.trace).toBeUndefined();
	});

	it('carries the trace onto the evidence when the route sent one', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({
				request: REQUEST,
				present: { submitted: true, transportStatus: 200 },
				trace: TRACE
			})
		) as typeof fetch;

		const { settled, handle } = drive();
		handle.present('https://verifier.test/interactions/ex-1');

		expect((await settled).trace).toEqual(TRACE);
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

		expect((await missed).note).toMatch(/rejected/);
	});

	it('hands a miss the evidence it observed, so the Details panel can explain it', async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse({
				request: REQUEST,
				present: {
					submitted: false,
					transportStatus: 409,
					error: { message: 'The exchange rejected it.' }
				},
				trace: TRACE
			})
		) as typeof fetch;

		const { missed, handle } = drive();
		handle.present('https://verifier.test/interactions/miss');

		const { observed } = await missed;
		expect(observed.trace).toEqual(TRACE);
		expect(observed.verifierRequest).toMatchObject({ vcapiAdvertised: true });
		expect(observed.verifierPresent).toMatchObject({ submitted: false, transportStatus: 409 });
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
