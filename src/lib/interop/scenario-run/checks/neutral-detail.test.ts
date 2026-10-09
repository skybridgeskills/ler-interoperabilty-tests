import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	PRESENT_COPY,
	PRESENT_HINT,
	PRESENT_MISS_NOTE,
	PRESENT_SETTLED_NOTE
} from '$lib/pages/scenario/present-step.js';
import {
	RECEIVE_COPY,
	RECEIVE_HINT,
	RECEIVE_MISS_NOTE,
	RECEIVE_SETTLED_NOTE
} from '$lib/pages/scenario/receive-step.js';

import { automaticChecks } from '../automatic-checks.js';
import type { RunEvidence, StepEvidence } from '../evidence.js';

/**
 * Check `detail`s and the run page's receive/present copy are neutral.
 *
 * A detail is shown under its requirement to whoever is running the scenario —
 * the team that built the product, or someone evaluating one they do not own —
 * so it says "the issuer", never "your issuer". The operator is still "you"
 * ("the input you pasted"); only the product changes.
 *
 * Three layers, because no fixture set reaches every branch of 70-odd checks:
 *
 * 1. every registered check, run against empty evidence and a spread of
 *    minimal failing (and a few passing) shapes across every evidence slot;
 * 2. a source scan of every check module's non-comment lines, which catches
 *    the branches the fixtures cannot reach (a template detail behind a deep
 *    payload condition, say);
 * 3. the run page's receive/present prompts, placeholders, hints and notes.
 */

const STEP = 'step';
const YOUR = /\byour\b/i;

const withStep = (step: Omit<StepEvidence, 'stepId'>): RunEvidence => ({
	steps: { [STEP]: { stepId: STEP, ...step } }
});

const failingTls = { atLeastTls12: false, protocol: 'TLSv1.0', error: 'handshake failed' };
const passingTls = { atLeastTls12: true, protocol: 'TLSv1.3' };

/** A credential that fails most payload checks: no proof, no status, an odd subject. */
const brokenCredential = {
	'@context': ['https://www.w3.org/2018/credentials/v1'],
	type: ['VerifiableCredential'],
	issuer: 'https://issuer.example',
	validUntil: '2020-01-01T00:00:00Z',
	credentialSubject: {
		identifier: [
			{ type: 'IdentityObject', identityType: 'emailAddress', hashed: true, identityHash: 'x' }
		],
		result: [{ resultDescription: 'urn:missing', value: '200' }]
	}
};

/** A credential whose subject names its recipient in no recognised way. */
const unidentifiedCredential = {
	...brokenCredential,
	credentialSubject: { identifier: [{ type: 'Other' }, { identityType: 'sourcedId' }] }
};

/** Named so a failure says which shape produced the offending detail. */
const EVIDENCE: Record<string, RunEvidence> = {
	empty: { steps: {} },
	'bare step': withStep({}),
	'pending exchange': withStep({ exchange: { state: 'pending' } }),
	'invalid exchange, empty variables': withStep({ exchange: { state: 'invalid', variables: {} } }),
	'complete exchange, failed verification': withStep({
		exchange: {
			state: 'complete',
			variables: {
				results: { default: { verified: false, verifiablePresentation: 'eyJhbGciOi.jwt.vp' } },
				oid4vp: { responseReceived: false }
			},
			discoveryElections: [{ construction: 'oidc-concat', doc: 'issuer', at: '2026-01-01' }]
		}
	}),
	'complete exchange, object VP without proof': withStep({
		exchange: {
			state: 'complete',
			variables: {
				results: {
					default: {
						verified: true,
						verifiablePresentation: { type: ['VerifiablePresentation'], holder: 'did:web:x' }
					}
				}
			}
		}
	}),
	'artifact: not an object': withStep({ artifact: 'not-a-credential' }),
	'artifact: empty object': withStep({ artifact: {} }),
	'artifact: broken credential': withStep({ artifact: brokenCredential }),
	'artifact: unidentified recipient': withStep({ artifact: unidentifiedCredential }),
	'transport: not delivered': withStep({
		transport: { delivered: false, error: { message: 'nothing arrived' } }
	}),
	'direct intake, unverified': withStep({
		artifact: brokenCredential,
		issuerFlow: { transport: 'direct', verified: false, verifyErrors: ['bad proof'] }
	}),
	'vcalm intake, all false': withStep({
		issuerFlow: {
			transport: 'vcalm',
			verified: false,
			interactionFetched: false,
			participationOk: false,
			vcapiAdvertised: false,
			didAuthRequested: false,
			didAuthQueryMissing: true,
			interactionTls: failingTls,
			holderDid: 'did:key:z6Mk-holder',
			subjectId: 'did:key:z6Mk-someone-else'
		}
	}),
	'vcalm intake, all true': withStep({
		issuerFlow: {
			transport: 'vcalm',
			verified: true,
			interactionFetched: true,
			participationOk: true,
			vcapiAdvertised: true,
			didAuthRequested: true,
			interactionTls: passingTls,
			holderDid: 'did:key:z6Mk-holder',
			subjectId: 'did:key:z6Mk-holder'
		}
	}),
	'oid4vci intake, all false': withStep({
		issuerFlow: {
			transport: 'oid4vci',
			verified: false,
			metadataReachable: false,
			diVpOffered: false,
			proofTypesOffered: ['jwt'],
			diVpSigningAlgs: ['bbs-2023'],
			diVpSigningAlgInBundle: false,
			preAuthCodeRedeemed: false,
			credentialDelivered: false,
			credentialStatus: 500,
			issuerTls: failingTls
		}
	}),
	'oid4vci intake, all true': withStep({
		issuerFlow: {
			transport: 'oid4vci',
			verified: true,
			metadataReachable: true,
			diVpOffered: true,
			proofTypesOffered: ['di_vp'],
			diVpSigningAlgs: ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'],
			diVpSigningAlgInBundle: true,
			preAuthCodeRedeemed: true,
			credentialDelivered: true,
			credentialStatus: 200,
			issuerTls: passingTls,
			holderDid: 'did:key:z6Mk-holder',
			subjectId: 'did:key:z6Mk-holder'
		}
	}),
	'vcalm request, all false': withStep({
		verifierRequest: {
			transport: 'vcalm',
			vcapiAdvertised: false,
			vprReceived: false,
			vprMatched: false,
			matchReason: 'no OpenBadgeCredential query',
			didAuth: false,
			requestTls: failingTls,
			responseTls: failingTls
		},
		verifierPresent: { submitted: false, transportStatus: 422, error: { message: 'rejected' } }
	}),
	'oid4vp request, all false': withStep({
		verifierRequest: {
			transport: 'oid4vp',
			requestForm: 'by-reference',
			requestResolved: false,
			matchable: false,
			matchReason: 'no OpenBadgeCredential descriptor',
			diVpFormat: 'jwt-only',
			requestTls: failingTls,
			responseTls: failingTls
		},
		verifierPresent: { submitted: false, transportStatus: 400 }
	})
};

describe('automatic-check details are neutral', () => {
	const ids = Object.keys(automaticChecks);

	it('covers the whole registry', () => {
		expect(ids.length).toBeGreaterThan(0);
	});

	it('never say "your" for any registered check, against any fixture shape', () => {
		const offenders: { check: string; evidence: string; detail: string }[] = [];
		for (const id of ids) {
			for (const [shape, evidence] of Object.entries(EVIDENCE)) {
				const { detail } = automaticChecks[id].run({ stepId: STEP, evidence });
				if (detail && YOUR.test(detail)) offenders.push({ check: id, evidence: shape, detail });
			}
		}
		expect(offenders).toEqual([]);
	});

	it('never say "your" in any check module outside comments', () => {
		const here = dirname(fileURLToPath(import.meta.url));
		const offenders: { file: string; line: number; text: string }[] = [];
		const modules = readdirSync(here).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
		for (const file of [
			...modules.map((f) => join(here, f)),
			join(here, '../automatic-checks.ts')
		]) {
			readFileSync(file, 'utf8')
				.split('\n')
				.forEach((text, index) => {
					if (/^\s*(\*|\/\/|\/\*)/.test(text)) return;
					if (YOUR.test(text)) offenders.push({ file, line: index + 1, text: text.trim() });
				});
		}
		expect(offenders).toEqual([]);
	});
});

describe('run-page receive and present copy is neutral', () => {
	const strings: Record<string, string> = {
		RECEIVE_HINT,
		RECEIVE_MISS_NOTE,
		RECEIVE_SETTLED_NOTE,
		PRESENT_HINT,
		PRESENT_MISS_NOTE,
		PRESENT_SETTLED_NOTE,
		...Object.fromEntries(
			Object.entries(RECEIVE_COPY).flatMap(([transport, copy]) => [
				[`RECEIVE_COPY.${transport}.prompt`, copy.prompt],
				[`RECEIVE_COPY.${transport}.placeholder`, copy.placeholder]
			])
		),
		...Object.fromEntries(
			Object.entries(PRESENT_COPY).flatMap(([transport, copy]) => [
				[`PRESENT_COPY.${transport}.prompt`, copy.prompt],
				[`PRESENT_COPY.${transport}.placeholder`, copy.placeholder]
			])
		)
	};

	it('carries no "your"', () => {
		const offenders = Object.entries(strings).filter(([, text]) => YOUR.test(text));
		expect(offenders).toEqual([]);
	});
});
