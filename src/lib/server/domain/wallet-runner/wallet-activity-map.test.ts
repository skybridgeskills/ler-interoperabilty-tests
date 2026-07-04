import { describe, expect, it } from 'vitest';

import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';
import type { Oid4IssuerFlowObservations } from '$lib/server/domain/wallet-client/drivers/oid4-issuer-flow.js';
import type { IssuerFlowObservations } from '$lib/server/domain/wallet-client/drivers/vcalm-issuer-flow.js';

import {
	credentialArtifact,
	directDeliveryActivity,
	oid4Activity,
	vcalmActivity
} from './wallet-activity-map.js';

const credential = {
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	name: 'Algebra II Final Exam',
	issuer: { id: 'did:key:zIssuer', name: 'Sample Issuer' },
	validFrom: '2026-04-01T00:00:00Z',
	credentialSubject: { achievement: { name: 'Algebra II Achievement' } }
};

describe('vcalmActivity', () => {
	it('happy path: emits the three interactions + a passing verify check in order', () => {
		const obs: IssuerFlowObservations = {
			interaction: { ok: true, status: 200, vcapiUrl: 'https://issuer.test/vcapi', rawBody: {} },
			didAuth: { status: 200, challenge: 'abc' },
			delivery: { status: 200, credential, holderDid: 'did:key:zHolder' },
			verify: { verified: true, cryptosuite: 'eddsa-rdfc-2022' }
		};
		const activity = vcalmActivity(obs, { blocked: false });

		expect(activity.map((a) => a.id)).toEqual([
			'vcalm.interaction',
			'vcalm.didauth',
			'vcalm.delivery',
			'verify'
		]);
		expect(activity.every((a) => a.status === 'ok')).toBe(true);
		expect(activity[0].stepIndex).toBe(0);
		expect(activity.at(-1)?.kind).toBe('check');
	});

	it('blocking failure mid-flow: omits steps that did not run', () => {
		// Blocked at step 2 (no DIDAuth challenge) → delivery + verify never ran.
		const obs: IssuerFlowObservations = {
			interaction: { ok: true, status: 200, vcapiUrl: 'https://issuer.test/vcapi', rawBody: {} },
			didAuth: { status: 500, error: 'No DIDAuthentication challenge returned.' }
		};
		const activity = vcalmActivity(obs, { blocked: true, stoppedAtStep: 2 });

		expect(activity.map((a) => a.id)).toEqual(['vcalm.interaction', 'vcalm.didauth']);
		expect(activity[0].status).toBe('ok');
		expect(activity[1].status).toBe('fail');
		expect(activity[1].detail).toMatch(/challenge/);
	});

	it('unverified credential: delivery ok, verify check reads fail', () => {
		const obs: IssuerFlowObservations = {
			interaction: { ok: true, status: 200, vcapiUrl: 'https://issuer.test/vcapi', rawBody: {} },
			didAuth: { status: 200, challenge: 'abc' },
			delivery: { status: 200, credential, holderDid: 'did:key:zHolder' },
			verify: { verified: false, errors: ['proof did not verify'] }
		};
		const activity = vcalmActivity(obs, { blocked: false });
		const verify = activity.find((a) => a.id === 'verify');

		expect(activity.find((a) => a.id === 'vcalm.delivery')?.status).toBe('ok');
		expect(verify?.status).toBe('fail');
		expect(verify?.detail).toBe('proof did not verify');
	});
});

describe('oid4Activity', () => {
	function baseObs(): Oid4IssuerFlowObservations {
		return {
			transcript: [
				{ name: 'offer', method: 'GET', url: 'u', ok: true, status: 200, responseBody: {} },
				{
					name: 'issuer-metadata',
					method: 'GET',
					url: 'u',
					ok: true,
					status: 200,
					responseBody: {}
				},
				{ name: 'token', method: 'POST', url: 'u', ok: true, status: 200, responseBody: {} },
				{ name: 'credential', method: 'POST', url: 'u', ok: true, status: 200, responseBody: {} }
			]
		};
	}

	it('happy path: maps the ordered transcript + appends a verify check', () => {
		const obs = baseObs();
		obs.verify = { verified: true, cryptosuite: 'eddsa-rdfc-2022' };
		const activity = oid4Activity(obs, { blocked: false });

		expect(activity).toHaveLength(5);
		expect(activity[0].label).toBe('Fetched credential offer');
		expect(activity[0].stepIndex).toBe(0);
		expect(activity[2].stepIndex).toBe(1); // token
		expect(activity.at(-1)).toMatchObject({ id: 'verify', kind: 'check', status: 'ok' });
	});

	it('blocking failure mid-flow: a failed transcript step reads fail, no verify emitted', () => {
		const obs: Oid4IssuerFlowObservations = {
			transcript: [
				{ name: 'offer', method: 'GET', url: 'u', ok: true, status: 200, responseBody: {} },
				{
					name: 'token',
					method: 'POST',
					url: 'u',
					ok: false,
					status: 400,
					responseBody: {},
					error: 'token request responded 400.'
				}
			]
		};
		const activity = oid4Activity(obs, { blocked: true, stoppedAtStep: 2 });

		expect(activity).toHaveLength(2);
		expect(activity[1].status).toBe('fail');
		expect(activity[1].detail).toMatch(/400/);
		expect(activity.some((a) => a.id === 'verify')).toBe(false);
	});

	it('unverified credential: verify check reads fail', () => {
		const obs = baseObs();
		obs.verify = { verified: false, errors: ['issuer DID did not resolve'] };
		const activity = oid4Activity(obs, { blocked: false });

		expect(activity.at(-1)).toMatchObject({ id: 'verify', status: 'fail' });
	});
});

describe('credentialArtifact', () => {
	it('extracts a display summary and verified flag', () => {
		const artifact = credentialArtifact(credential, { verified: true });
		expect(artifact).toEqual({
			kind: 'credential',
			title: 'Algebra II Achievement',
			issuer: 'Sample Issuer',
			issuanceDate: '2026-04-01T00:00:00Z',
			verified: true,
			types: ['VerifiableCredential', 'OpenBadgeCredential']
		});
	});

	it('falls back to credential name and a string issuer, defaults verified false', () => {
		const artifact = credentialArtifact({
			type: 'VerifiableCredential',
			name: 'Bare Credential',
			issuer: 'did:key:zIssuer',
			issuanceDate: '2026-01-01T00:00:00Z'
		});
		expect(artifact).toMatchObject({
			title: 'Bare Credential',
			issuer: 'did:key:zIssuer',
			issuanceDate: '2026-01-01T00:00:00Z',
			verified: false,
			types: ['VerifiableCredential']
		});
	});

	it('returns undefined when no credential was produced', () => {
		expect(credentialArtifact(undefined)).toBeUndefined();
		expect(credentialArtifact(null)).toBeUndefined();
	});
});

describe('directDeliveryActivity', () => {
	function report(over: Partial<IssuerRunnerReport>): IssuerRunnerReport {
		return { verified: true, groups: [], ...over };
	}

	it('happy path: loaded (info) + verifier-core ok + conformance ok', () => {
		const activity = directDeliveryActivity(
			report({
				verified: true,
				groups: [
					{
						checklist: {
							kind: 'base',
							profileSlug: 'ob3-direct-delivery',
							profileName: 'OB3',
							workflow: 'credential-issuance',
							role: 'issuer'
						},
						outcomes: [{ id: 'a', level: 'MUST', status: 'pass', message: '' }]
					}
				]
			})
		);
		expect(activity.map((a) => `${a.id}:${a.status}`)).toEqual([
			'direct.loaded:info',
			'direct.verify:ok',
			'direct.conformance:ok'
		]);
	});

	it('unverified credential: verifier-core + conformance read fail with a failing-MUST detail', () => {
		const activity = directDeliveryActivity(
			report({
				verified: false,
				groups: [
					{
						checklist: {
							kind: 'base',
							profileSlug: 'ob3-direct-delivery',
							profileName: 'OB3',
							workflow: 'credential-issuance',
							role: 'issuer'
						},
						outcomes: [{ id: 'a', level: 'MUST', status: 'fail', message: 'nope' }]
					}
				]
			})
		);
		expect(activity.find((a) => a.id === 'direct.verify')?.status).toBe('fail');
		const conformance = activity.find((a) => a.id === 'direct.conformance');
		expect(conformance?.status).toBe('fail');
		expect(conformance?.detail).toMatch(/1 MUST requirement failed/);
	});
});
