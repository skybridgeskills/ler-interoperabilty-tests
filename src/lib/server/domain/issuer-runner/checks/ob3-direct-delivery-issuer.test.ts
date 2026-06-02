import { describe, expect, it } from 'vitest';

import { percentFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/percent.js';
import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';
import { rubricCriterionLevelFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/rubric-criterion-level.js';

import { ob3DirectDeliveryIssuerChecks } from './ob3-direct-delivery-issuer.js';
import type { CheckCtx } from './types.js';

const baseCtx = (credential: unknown): CheckCtx => ({
	credential,
	verifierResult: { verified: true, log: [{ id: 'valid_signature', valid: true }] },
	includeAdditive: false
});

describe('ob3-direct-delivery issuer checks — happy-path fixtures', () => {
	const fixtures = [
		{ name: 'RawScore', credential: rawScoreFixture },
		{ name: 'Percent', credential: percentFixture },
		{ name: 'RubricCriterionLevel', credential: rubricCriterionLevelFixture }
	];

	for (const { name, credential } of fixtures) {
		it(`${name} fixture passes every credential-shape check`, () => {
			const ctx = baseCtx(credential);
			const ids = [
				'ob3-direct-delivery.vc-data-model-v2-compliant',
				'ob3-direct-delivery.openbadgecredential-type',
				'ob3-direct-delivery.subject-id-is-email',
				'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022',
				'ob3-direct-delivery.bitstring-status-list-entry',
				'ob3-direct-delivery.issuer-did-method'
			];
			for (const id of ids) {
				const result = ob3DirectDeliveryIssuerChecks[id]?.(ctx);
				expect(result?.status, `${id} on ${name}`).toBe('pass');
			}
		});
	}
});

describe('ob3-direct-delivery issuer checks — rejection cases', () => {
	it('flags a missing @context', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		delete broken['@context'];
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.vc-data-model-v2-compliant']!(
			baseCtx(broken)
		);
		expect(out.status).toBe('fail');
	});

	it('flags a non-email credentialSubject.id', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.id = 'did:key:zNotAnEmail';
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.subject-id-is-email']!(
			baseCtx(broken)
		);
		expect(out.status).toBe('fail');
	});

	it('warns on a bare-email credentialSubject.id', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.id = 'learner@example.edu';
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.subject-id-is-email']!(
			baseCtx(broken)
		);
		expect(out.status).toBe('warn');
	});

	it('flags a wrong cryptosuite', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.proof.cryptosuite = 'bbs-2023';
		const out = ob3DirectDeliveryIssuerChecks[
			'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022'
		]!(baseCtx(broken));
		expect(out.status).toBe('fail');
	});

	it('flags a non-did:web/did:key issuer', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.issuer.id = 'did:ion:abc123';
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.issuer-did-method']!(
			baseCtx(broken)
		);
		expect(out.status).toBe('fail');
	});

	it('flags a missing Bitstring Status List entry', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		delete broken.credentialStatus;
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.bitstring-status-list-entry']!(
			baseCtx(broken)
		);
		expect(out.status).toBe('fail');
	});
});

describe('ob3-direct-delivery issuer checks — n/a cases', () => {
	it('returns n/a for the auth.secure-login process step', () => {
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.auth.secure-login']!(
			baseCtx(rawScoreFixture)
		);
		expect(out.status).toBe('n/a');
	});

	it('returns n/a for validUntil when not declared', () => {
		const out = ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.valid-until-optional']!(
			baseCtx(rawScoreFixture)
		);
		expect(out.status).toBe('n/a');
	});
});
