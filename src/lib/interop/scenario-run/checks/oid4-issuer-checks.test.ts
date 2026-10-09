import { describe, expect, it } from 'vitest';

import { checkById } from '../automatic-checks.js';
import type { IssuerFlowSummary, RunEvidence } from '../evidence.js';

/**
 * The eight OID4VCI issuer wire checks, ported from
 * `wallet-runner/checks/oid4-issuer-flow.ts`. Covers every fail branch, the
 * `warn`→`fail` resolution on `di-vp-signing-algs`, and the `tls` merge.
 */

/** A clean OID4VCI issuer summary — every wire fact satisfied. */
const clean: IssuerFlowSummary = {
	transport: 'oid4vci',
	verified: true,
	metadataReachable: true,
	diVpOffered: true,
	proofTypesOffered: ['di_vp'],
	diVpSigningAlgs: ['eddsa-rdfc-2022'],
	diVpSigningAlgInBundle: true,
	preAuthCodeRedeemed: true,
	credentialDelivered: true,
	credentialStatus: 200,
	issuerTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
	holderDid: 'did:key:zHolder',
	subjectId: 'did:key:zHolder'
};

const vcalmSummary: IssuerFlowSummary = {
	transport: 'vcalm',
	verified: true,
	interactionFetched: true,
	participationOk: true,
	vcapiAdvertised: true,
	didAuthRequested: true,
	interactionTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
};

function evidence(flow?: IssuerFlowSummary): RunEvidence {
	return { steps: { s1: { stepId: 's1', ...(flow ? { issuerFlow: flow } : {}) } } };
}

function run(id: string, ev: RunEvidence) {
	const check = checkById(id);
	expect(check, `check "${id}" is registered`).toBeDefined();
	return check!.run({ stepId: 's1', evidence: ev });
}

const OID4_CHECKS = [
	'oid4-issuer-metadata-endpoint',
	'oid4-issuer-di-vp-proof-type',
	'oid4-issuer-di-vp-signing-algs',
	'oid4-issuer-not-jwt-only-proof',
	'oid4-issuer-tls',
	'oid4-issuer-pre-authorized-code',
	'oid4-issuer-credential-endpoint',
	'oid4-issuer-di-vp-accepted'
];

describe('the OID4VCI issuer checks', () => {
	it('all pass on a clean summary', () => {
		for (const id of OID4_CHECKS) expect(run(id, evidence(clean)).met, id).toBe(true);
	});

	it('all fail legibly with no summary at all, rather than throwing', () => {
		for (const id of OID4_CHECKS) {
			const result = run(id, evidence(undefined));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toBeTruthy();
		}
	});

	it('all fail on another transport’s summary', () => {
		for (const id of OID4_CHECKS) {
			const result = run(id, evidence(vcalmSummary));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toMatch(/OID4VCI/);
		}
	});

	it('there is exactly one TLS check — `tls-credential` is merged, not restored', () => {
		expect(checkById('oid4-issuer-tls-credential')).toBeUndefined();
		expect(run('oid4-issuer-tls', evidence(clean)).detail).toMatch(
			/metadata, token and credential/
		);
	});
});

describe('oid4-issuer-metadata-endpoint', () => {
	it('fails when the metadata named no credential endpoint', () => {
		expect(
			run('oid4-issuer-metadata-endpoint', evidence({ ...clean, metadataReachable: false })).met
		).toBe(false);
	});
});

describe('oid4-issuer-di-vp-proof-type and oid4-issuer-not-jwt-only-proof', () => {
	const jwtOnly: IssuerFlowSummary = {
		...clean,
		diVpOffered: false,
		proofTypesOffered: ['jwt'],
		diVpSigningAlgs: [],
		diVpSigningAlgInBundle: false
	};

	it('both fail on a JWT-only offering, and each says which question it answers', () => {
		const proofType = run('oid4-issuer-di-vp-proof-type', evidence(jwtOnly));
		const notJwtOnly = run('oid4-issuer-not-jwt-only-proof', evidence(jwtOnly));
		expect(proofType.met).toBe(false);
		expect(notJwtOnly.met).toBe(false);
		// The proof-type row names what was advertised; the not-JWT-only row says
		// what the profile requires. Same fact, different question.
		expect(proofType.detail).toMatch(/jwt/);
		expect(notJwtOnly.detail).toMatch(/requires/i);
		expect(proofType.detail).not.toBe(notJwtOnly.detail);
	});

	it('names "none" when the metadata advertised no proof types at all', () => {
		const none: IssuerFlowSummary = { ...jwtOnly, proofTypesOffered: [] };
		expect(run('oid4-issuer-di-vp-proof-type', evidence(none)).detail).toMatch(/none/);
	});
});

describe('oid4-issuer-di-vp-signing-algs', () => {
	it('fails when `proof_signing_alg_values_supported` is absent', () => {
		const result = run(
			'oid4-issuer-di-vp-signing-algs',
			evidence({ ...clean, diVpSigningAlgs: [], diVpSigningAlgInBundle: false })
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/proof_signing_alg_values_supported/);
	});

	it('FAILS when the algs list none of the bundle — the engine’s `warn`, resolved (M11)', () => {
		const result = run(
			'oid4-issuer-di-vp-signing-algs',
			evidence({ ...clean, diVpSigningAlgs: ['bbs-2023'], diVpSigningAlgInBundle: false })
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/bbs-2023/);
		expect(result.detail).toMatch(/cannot sign/i);
	});
});

describe('oid4-issuer-tls', () => {
	it('fails below TLS 1.2, carrying the probe’s reason', () => {
		const result = run(
			'oid4-issuer-tls',
			evidence({
				...clean,
				issuerTls: { atLeastTls12: false, error: 'The issuer host is not served over HTTPS.' }
			})
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/not served over HTTPS/);
	});
});

describe('oid4-issuer-pre-authorized-code', () => {
	it('fails when the token endpoint refused the grant', () => {
		expect(
			run('oid4-issuer-pre-authorized-code', evidence({ ...clean, preAuthCodeRedeemed: false })).met
		).toBe(false);
	});
});

describe('oid4-issuer-credential-endpoint and oid4-issuer-di-vp-accepted', () => {
	const refused: IssuerFlowSummary = {
		...clean,
		credentialDelivered: false,
		credentialStatus: 401
	};

	it('both fail when nothing was delivered, each answering its own question', () => {
		const endpoint = run('oid4-issuer-credential-endpoint', evidence(refused));
		const accepted = run('oid4-issuer-di-vp-accepted', evidence(refused));
		expect(endpoint.met).toBe(false);
		expect(accepted.met).toBe(false);
		expect(endpoint.detail).not.toBe(accepted.detail);
		// The endpoint row reports the status it saw; the key-proof row does not.
		expect(endpoint.detail).toMatch(/401/);
		expect(accepted.detail).toMatch(/key proof/);
	});

	it('both carry the engine’s honesty caveats on a pass', () => {
		expect(run('oid4-issuer-credential-endpoint', evidence(clean)).detail).toMatch(
			/not negatively probed/
		);
		expect(run('oid4-issuer-di-vp-accepted', evidence(clean)).detail).toMatch(
			/not negatively probed/
		);
	});

	it('omits the status when the endpoint reported none', () => {
		const noStatus: IssuerFlowSummary = {
			...clean,
			credentialDelivered: false,
			credentialStatus: undefined
		};
		expect(run('oid4-issuer-credential-endpoint', evidence(noStatus)).detail).not.toMatch(/\(/);
	});
});
