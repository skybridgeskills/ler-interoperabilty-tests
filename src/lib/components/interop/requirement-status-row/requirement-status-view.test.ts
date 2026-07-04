import { describe, expect, it } from 'vitest';

import type { StepRunState } from '$lib/interop/index.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

import {
	outcomeToRequirementStatus,
	runStatusToneClasses,
	stepStateToRequirementStatus
} from './requirement-status-view.js';

const outcome = (
	status: CheckOutcome['status'],
	level: CheckOutcome['level'] = 'MUST'
): CheckOutcome => ({ id: 'x', level, status, message: `${status} message` });

describe('outcomeToRequirementStatus', () => {
	it('maps an absent outcome to pending', () => {
		expect(outcomeToRequirementStatus(undefined)).toEqual({
			tone: 'pending',
			label: 'PENDING',
			raw: undefined
		});
	});

	it('threads raw through even when the step has not run', () => {
		const raw = { protocols: {} };
		expect(outcomeToRequirementStatus(undefined, raw)).toEqual({
			tone: 'pending',
			label: 'PENDING',
			raw
		});
	});

	it('maps pass with the outcome badge label and message', () => {
		expect(outcomeToRequirementStatus(outcome('pass'))).toMatchObject({
			tone: 'pass',
			label: 'PASS',
			message: 'pass message'
		});
	});

	it('maps warn', () => {
		expect(outcomeToRequirementStatus(outcome('warn', 'SHOULD'))).toMatchObject({
			tone: 'warn',
			label: 'WARN'
		});
	});

	it('maps n/a', () => {
		expect(outcomeToRequirementStatus(outcome('n/a'))).toMatchObject({
			tone: 'n/a',
			label: 'N/A'
		});
	});

	it('maps a MUST failure to FAIL · MUST', () => {
		expect(outcomeToRequirementStatus(outcome('fail', 'MUST'))).toMatchObject({
			tone: 'fail',
			label: 'FAIL · MUST'
		});
	});

	it('maps a SHOULD failure to FAIL · SHOULD (still fail tone)', () => {
		expect(outcomeToRequirementStatus(outcome('fail', 'SHOULD'))).toMatchObject({
			tone: 'fail',
			label: 'FAIL · SHOULD'
		});
	});

	it('threads raw into the view', () => {
		const raw = { status: 200 };
		expect(outcomeToRequirementStatus(outcome('pass'), raw).raw).toBe(raw);
	});
});

describe('stepStateToRequirementStatus', () => {
	const cases: Array<[StepRunState, { tone: string; label: string }]> = [
		['pending', { tone: 'pending', label: 'PENDING' }],
		['in-flight', { tone: 'in-flight', label: 'IN PROGRESS' }],
		['complete', { tone: 'pass', label: 'DONE' }],
		['failed', { tone: 'fail', label: 'FAILED' }],
		['skipped', { tone: 'skipped', label: 'SKIPPED' }]
	];

	it.each(cases)('maps step state %s to its tone + label', (state, expected) => {
		expect(stepStateToRequirementStatus(state)).toMatchObject(expected);
	});

	it('passes optional details through as message + raw', () => {
		const raw = { exchangeId: 'abc' };
		expect(stepStateToRequirementStatus('in-flight', { message: 'working…', raw })).toEqual({
			tone: 'in-flight',
			label: 'IN PROGRESS',
			message: 'working…',
			raw
		});
	});

	it('omits message + raw when no details are given', () => {
		expect(stepStateToRequirementStatus('complete')).toEqual({
			tone: 'pass',
			label: 'DONE',
			message: undefined,
			raw: undefined
		});
	});
});

describe('runStatusToneClasses', () => {
	it('maps pass to the green success family', () => {
		expect(runStatusToneClasses('pass')).toEqual({ dot: 'bg-success', label: 'text-success' });
	});

	it('maps a MUST fail to the red destructive family', () => {
		expect(runStatusToneClasses('fail', 'MUST')).toEqual({
			dot: 'bg-destructive',
			label: 'text-destructive'
		});
	});

	it('maps a SHOULD/MAY (advisory) fail to amber warning', () => {
		expect(runStatusToneClasses('fail', 'SHOULD')).toEqual({
			dot: 'bg-warning',
			label: 'text-warning'
		});
		expect(runStatusToneClasses('fail', 'MAY')).toEqual({
			dot: 'bg-warning',
			label: 'text-warning'
		});
	});

	it('maps warn to amber warning', () => {
		expect(runStatusToneClasses('warn')).toEqual({ dot: 'bg-warning', label: 'text-warning' });
	});

	it('maps in-flight to the warm progress family and pulses the dot', () => {
		const { dot, label } = runStatusToneClasses('in-flight');
		expect(dot).toContain('bg-progress');
		expect(dot).toContain('animate-pulse');
		expect(label).toBe('text-progress');
	});

	it('renders pending as a hollow ring (border, no fill)', () => {
		const { dot } = runStatusToneClasses('pending');
		expect(dot).toContain('border');
		expect(dot).not.toContain('bg-');
	});

	it('maps n/a and skipped to neutral muted', () => {
		expect(runStatusToneClasses('n/a').label).toBe('text-muted-foreground');
		expect(runStatusToneClasses('skipped').label).toContain('line-through');
	});

	it('never uses blue (primary/requirement) or a hand-rolled amber-500 for a result', () => {
		const tones = ['pass', 'warn', 'fail', 'in-flight', 'skipped', 'n/a', 'pending'] as const;
		for (const tone of tones) {
			for (const level of [undefined, 'MUST', 'SHOULD', 'MAY'] as const) {
				const { dot, label } = runStatusToneClasses(tone, level);
				const combined = `${dot} ${label}`;
				expect(combined).not.toMatch(/primary|requirement|amber-500/);
			}
		}
	});
});
