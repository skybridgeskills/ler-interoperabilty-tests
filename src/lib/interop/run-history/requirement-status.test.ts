import { describe, expect, it } from 'vitest';

import { RequirementStatus, RequirementStatusTone } from './requirement-status.js';

describe('RequirementStatusTone', () => {
	it('accepts every known tone', () => {
		for (const tone of ['pass', 'warn', 'fail', 'pending', 'in-flight', 'skipped', 'n/a']) {
			expect(RequirementStatusTone.schema.parse(tone)).toBe(tone);
		}
	});

	it('rejects an unknown tone', () => {
		expect(() => RequirementStatusTone.schema.parse('bogus')).toThrow();
	});
});

describe('RequirementStatus', () => {
	it('builds a minimal status (tone + label only)', () => {
		const status = RequirementStatus({ tone: 'pass', label: 'PASS' });
		expect(status).toEqual({ tone: 'pass', label: 'PASS' });
	});

	it('keeps optional message + attested when present', () => {
		const status = RequirementStatus({
			tone: 'fail',
			label: 'FAIL · MUST',
			message: 'signature invalid',
			attested: true
		});
		expect(status).toMatchObject({ message: 'signature invalid', attested: true });
	});

	it('strips `raw` — it is live-only and never persisted', () => {
		const parsed = RequirementStatus.schema.parse({
			tone: 'pass',
			label: 'PASS',
			raw: { body: 'debug' }
		});
		expect(parsed).not.toHaveProperty('raw');
	});

	it('rejects a status missing its label', () => {
		expect(() => RequirementStatus.schema.parse({ tone: 'pass' })).toThrow();
	});

	it('rejects an invalid tone', () => {
		expect(() => RequirementStatus.schema.parse({ tone: 'nope', label: 'X' })).toThrow();
	});
});
