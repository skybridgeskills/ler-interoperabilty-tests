import { describe, expect, it } from 'vitest';

import type { StepRunState } from '$lib/interop/index.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

import {
	statusesFromOutcomes,
	statusesFromStepStates,
	statusesFromVerifierOutcomes
} from './build-run-statuses.js';
import { VERIFIER_DEFERRED_REVOKED_ROW_ID } from './requirement-status-view.js';

const outcome = (
	id: string,
	status: CheckOutcome['status'],
	level: CheckOutcome['level'] = 'MUST'
): CheckOutcome => ({ id, level, status, message: `${status} message` });

describe('statusesFromOutcomes', () => {
	it('maps each requirement id to its issuer outcome status, stripping raw', () => {
		const requirements = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
		const outcomesById = {
			a: outcome('a', 'pass'),
			b: outcome('b', 'fail', 'MUST'),
			c: outcome('c', 'warn', 'SHOULD'),
			d: outcome('d', 'n/a')
		};
		const statuses = statusesFromOutcomes(requirements, outcomesById);
		expect(statuses).toEqual({
			a: { tone: 'pass', label: 'PASS', message: 'pass message' },
			b: { tone: 'fail', label: 'FAIL · MUST', message: 'fail message' },
			c: { tone: 'warn', label: 'WARN', message: 'warn message' },
			d: { tone: 'n/a', label: 'N/A', message: 'n/a message' }
		});
	});

	it('defaults a requirement with no outcome to pending (no raw key)', () => {
		const statuses = statusesFromOutcomes([{ id: 'missing' }], {});
		expect(statuses).toEqual({ missing: { tone: 'pending', label: 'PENDING' } });
		expect('raw' in statuses.missing).toBe(false);
	});

	it('includes combined (base + additive) requirements', () => {
		const statuses = statusesFromOutcomes([{ id: 'base' }, { id: 'additive' }], {
			base: outcome('base', 'pass')
		});
		expect(Object.keys(statuses)).toEqual(['base', 'additive']);
		expect(statuses.additive).toMatchObject({ tone: 'pending', label: 'PENDING' });
	});
});

describe('statusesFromVerifierOutcomes', () => {
	const verifierOutcome = (
		id: string,
		over: Partial<VerifierCheckOutcome> = {}
	): VerifierCheckOutcome => ({
		id,
		level: 'MUST',
		status: 'pass',
		message: 'Your verifier accepted the valid credential.',
		source: 'attested',
		attestation: { passLabel: 'Credential 1', kind: 'valid', verdict: 'accepted' },
		...over
	});

	it('keeps the attested flag for attested outcomes', () => {
		const statuses = statusesFromVerifierOutcomes([{ id: 'v' }], { v: verifierOutcome('v') });
		expect(statuses.v).toMatchObject({ tone: 'pass', label: 'PASS', attested: true });
		expect('raw' in statuses.v).toBe(false);
	});

	it('maps the deferred revoked row (n/a) to the skipped tone', () => {
		const id = VERIFIER_DEFERRED_REVOKED_ROW_ID;
		const statuses = statusesFromVerifierOutcomes([{ id }], {
			[id]: verifierOutcome(id, {
				status: 'n/a',
				source: 'automated',
				attestation: undefined,
				message: 'Revocation passes are not yet available in this suite.'
			})
		});
		expect(statuses[id]).toMatchObject({ tone: 'skipped', label: 'SKIPPED' });
		expect(statuses[id].attested).toBeUndefined();
	});

	it('defaults a requirement with no outcome to pending', () => {
		const statuses = statusesFromVerifierOutcomes([{ id: 'missing' }], {});
		expect(statuses).toEqual({ missing: { tone: 'pending', label: 'PENDING' } });
	});
});

describe('statusesFromStepStates', () => {
	it('fans each step state across that step’s requirements', () => {
		const steps = [
			{ requirements: [{ id: 'a1' }, { id: 'a2' }] },
			{ requirements: [{ id: 'b1' }] },
			{ requirements: [{ id: 'c1' }] }
		];
		const perStep: StepRunState[] = ['complete', 'in-flight', 'failed'];
		const statuses = statusesFromStepStates(steps, perStep);
		expect(statuses).toEqual({
			a1: { tone: 'pass', label: 'DONE', message: undefined },
			a2: { tone: 'pass', label: 'DONE', message: undefined },
			b1: { tone: 'in-flight', label: 'IN PROGRESS', message: undefined },
			c1: { tone: 'fail', label: 'FAILED', message: undefined }
		});
	});

	it('covers every StepRunState value', () => {
		const states: StepRunState[] = ['pending', 'in-flight', 'complete', 'failed', 'skipped'];
		const steps = states.map((_, i) => ({ requirements: [{ id: `r${i}` }] }));
		const statuses = statusesFromStepStates(steps, states);
		expect(statuses.r0).toMatchObject({ tone: 'pending', label: 'PENDING' });
		expect(statuses.r1).toMatchObject({ tone: 'in-flight', label: 'IN PROGRESS' });
		expect(statuses.r2).toMatchObject({ tone: 'pass', label: 'DONE' });
		expect(statuses.r3).toMatchObject({ tone: 'fail', label: 'FAILED' });
		expect(statuses.r4).toMatchObject({ tone: 'skipped', label: 'SKIPPED' });
	});

	it('defaults a step with no perStep entry to pending', () => {
		const steps = [{ requirements: [{ id: 'a' }] }, { requirements: [{ id: 'b' }] }];
		const statuses = statusesFromStepStates(steps, ['complete']);
		expect(statuses.b).toMatchObject({ tone: 'pending', label: 'PENDING' });
	});

	it('threads a per-state detail message through, dropping raw', () => {
		const steps = [{ requirements: [{ id: 'a' }] }];
		const statuses = statusesFromStepStates(steps, ['in-flight'], () => ({ message: 'working…' }));
		expect(statuses.a).toEqual({ tone: 'in-flight', label: 'IN PROGRESS', message: 'working…' });
		expect('raw' in statuses.a).toBe(false);
	});
});
