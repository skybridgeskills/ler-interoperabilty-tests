import { describe, expect, it } from 'vitest';

import { verifierDirectCredentialVerification } from './verifier-direct-credential-verification.js';

import { ob3DirectDelivery } from './index.js';

const acceptanceStep = verifierDirectCredentialVerification.steps.at(-1);

const expectedIds = [
	'ob3-direct-delivery.verifier-accepts-valid-credential',
	'ob3-direct-delivery.verifier-rejects-broken-signature',
	'ob3-direct-delivery.verifier-rejects-schema-problem',
	'ob3-direct-delivery.verifier-rejects-expired',
	'ob3-direct-delivery.verifier-rejects-revoked'
];

describe('verifier acceptance step', () => {
	it('is the final step of the checklist', () => {
		expect(acceptanceStep?.title).toBe('Demonstrate verification outcomes');
	});

	it('carries the five acceptance requirement ids in order', () => {
		expect(acceptanceStep?.requirements.map((r) => r.id)).toEqual(expectedIds);
	});

	it('marks every acceptance requirement MUST', () => {
		expect(acceptanceStep?.requirements.every((r) => r.level === 'MUST')).toBe(true);
	});

	it('now assigns an id to every pre-existing capability row', () => {
		const priorSteps = verifierDirectCredentialVerification.steps.slice(0, -1);
		expect(priorSteps).toHaveLength(6);
		for (const step of priorSteps) {
			for (const requirement of step.requirements) {
				expect(requirement.id).toBeDefined();
			}
		}
	});

	it('keeps requirement ids unique across the whole profile', () => {
		const ids = ob3DirectDelivery.checklists
			.flatMap((checklist) => checklist.steps)
			.flatMap((step) => step.requirements)
			.map((r) => r.id)
			.filter((id): id is string => id !== undefined);

		expect(new Set(ids).size).toBe(ids.length);
		for (const id of expectedIds) {
			expect(ids).toContain(id);
		}
	});
});
