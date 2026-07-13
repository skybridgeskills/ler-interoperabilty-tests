import { describe, expect, it } from 'vitest';

import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';

import { vcalm } from './index.js';

const acceptanceStep = verifierCredentialRequestAndVerification.steps.at(-1);

const expectedAcceptanceIds = [
	'vcalm.verifier-accepts-valid-credential',
	'vcalm.verifier-rejects-broken-signature',
	'vcalm.verifier-rejects-schema-problem',
	'vcalm.verifier-rejects-expired',
	'vcalm.verifier-rejects-revoked'
];

/** Floor row ids attached to pre-existing requirements — texts must stay byte-identical. */
const floorRows: Record<string, string> = {
	'vcalm.verifier-exchange-endpoint':
		'Implement the VCALM Exchanges exchange-participation endpoint.',
	'vcalm.verifier-vpr-query':
		'Generate a `verifiablePresentationRequest` with `QueryByExample` and a challenge value.',
	'vcalm.verifier-request-tls': 'Encrypt web-service endpoints with at least TLS 1.2.',
	'vcalm.verifier-interaction-endpoint':
		'Support an Interaction Protocols response that includes `vcapi`.',
	'vcalm.verifier-vpr-didauth':
		'Include a `DIDAuthentication` query in the request’s `query` array, alongside the `QueryByExample` credential query.',
	'vcalm.verifier-response-tls': 'Encrypt web-service endpoints with at least TLS 1.2.'
};

describe('vcalm verifier acceptance step', () => {
	it('is the final step of the checklist', () => {
		expect(acceptanceStep?.title).toBe('Demonstrate verification outcomes');
	});

	it('carries the five acceptance requirement ids in order', () => {
		expect(acceptanceStep?.requirements.map((r) => r.id)).toEqual(expectedAcceptanceIds);
	});

	it('marks every acceptance requirement MUST', () => {
		expect(acceptanceStep?.requirements.every((r) => r.level === 'MUST')).toBe(true);
	});
});

describe('vcalm verifier floor rows', () => {
	const priorSteps = verifierCredentialRequestAndVerification.steps.slice(0, -1);
	const priorRequirements = priorSteps.flatMap((step) => step.requirements);

	it('attaches each floor id to its pre-existing text, unchanged', () => {
		expect(priorSteps).toHaveLength(4);
		for (const [id, text] of Object.entries(floorRows)) {
			const row = priorRequirements.find((r) => r.id === id);
			expect(row, id).toBeDefined();
			expect(row?.text).toBe(text);
			expect(row?.level).toBe('MUST');
		}
	});

	it('assigns each floor id to its own step', () => {
		expect(priorSteps[0].requirements.map((r) => r.id)).toEqual([
			'vcalm.verifier-exchange-endpoint',
			'vcalm.verifier-vpr-query',
			'vcalm.verifier-request-tls'
		]);
		expect(priorSteps[1].requirements.map((r) => r.id)).toContain(
			'vcalm.verifier-interaction-endpoint'
		);
		expect(priorSteps[2].requirements.map((r) => r.id)).toContain('vcalm.verifier-vpr-didauth');
		expect(priorSteps[3].requirements.map((r) => r.id)).toContain('vcalm.verifier-response-tls');
	});

	it('now assigns an id to every pre-existing row', () => {
		expect(priorRequirements.every((r) => r.id !== undefined)).toBe(true);
	});
});

describe('vcalm requirement ids', () => {
	it('are unique across the whole profile', () => {
		const ids = vcalm.checklists
			.flatMap((checklist) => checklist.steps)
			.flatMap((step) => step.requirements)
			.map((r) => r.id)
			.filter((id): id is string => id !== undefined);

		expect(new Set(ids).size).toBe(ids.length);
		for (const id of [...expectedAcceptanceIds, ...Object.keys(floorRows)]) {
			expect(ids).toContain(id);
		}
	});
});
