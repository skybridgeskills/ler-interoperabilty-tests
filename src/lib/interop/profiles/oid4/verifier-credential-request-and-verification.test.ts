import { describe, expect, it } from 'vitest';

import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';

import { oid4 } from './index.js';

const acceptanceStep = verifierCredentialRequestAndVerification.steps.at(-1);

const expectedAcceptanceIds = [
	'oid4.verifier-accepts-valid-credential',
	'oid4.verifier-rejects-broken-signature',
	'oid4.verifier-rejects-schema-problem',
	'oid4.verifier-rejects-expired',
	'oid4.verifier-rejects-revoked'
];

/** Floor row ids attached to pre-existing requirements — texts must stay byte-identical. */
const floorRows: Record<string, string> = {
	'oid4.verifier-request-matchable':
		'Build an OID4VP Authorization Request with a `presentation_definition` / DCQL query for `OpenBadgeCredential` credentials.',
	'oid4.verifier-request-di-vp-format':
		'Request a Data Integrity verifiable presentation (`di_vp` / `ldp_vp`) format in the OID4VP presentation request, not a JWT VP.',
	'oid4.verifier-request-endpoint': 'Provide a presentation request endpoint.',
	'oid4.verifier-request-tls': 'Encrypt web-service endpoints with at least TLS 1.2.',
	'oid4.verifier-response-endpoint':
		'Provide a response endpoint (e.g. `direct_post`) that receives the presentation `vp_token`.',
	'oid4.verifier-response-tls': 'Encrypt web-service endpoints with at least TLS 1.2.'
};

describe('oid4 verifier acceptance step', () => {
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

describe('oid4 verifier floor rows', () => {
	const priorSteps = verifierCredentialRequestAndVerification.steps.slice(0, -1);
	const priorRequirements = priorSteps.flatMap((step) => step.requirements);

	it('attaches each floor id to its pre-existing text, unchanged', () => {
		expect(priorSteps).toHaveLength(2);
		for (const [id, text] of Object.entries(floorRows)) {
			const row = priorRequirements.find((r) => r.id === id);
			expect(row, id).toBeDefined();
			expect(row?.text).toBe(text);
			expect(row?.level).toBe('MUST');
		}
	});

	it('assigns step-1 ids and step-2 ids to their own steps', () => {
		expect(priorSteps[0].requirements.map((r) => r.id)).toEqual([
			'oid4.verifier-request-matchable',
			'oid4.verifier-request-di-vp-format',
			'oid4.verifier-request-endpoint',
			'oid4.verifier-request-tls'
		]);
		const step2Ids = priorSteps[1].requirements.map((r) => r.id).filter((id) => id !== undefined);
		expect(step2Ids).toEqual(['oid4.verifier-response-endpoint', 'oid4.verifier-response-tls']);
	});

	it('keeps every other pre-existing row id-less', () => {
		const idless = priorRequirements.filter((r) => r.id === undefined);
		expect(idless).toHaveLength(priorRequirements.length - Object.keys(floorRows).length);
	});
});

describe('oid4 requirement ids', () => {
	it('are unique across the whole profile', () => {
		const ids = oid4.checklists
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
