import { describe, expect, it } from 'vitest';

import { evidenceForRequirement, type RunRaw } from './vcalm-issuer-evidence.js';

const P = 'vcalm.issuer.credential-issuance.';

const raw: RunRaw = {
	interaction: { endpoint: 'https://issuer.example/interaction' },
	didAuth: { verifiablePresentationRequest: { query: [] } },
	delivery: {
		status: 200,
		credential: { id: 'urn:cred:1', proof: { type: 'DataIntegrityProof' } }
	},
	verify: { verified: true }
};

const credential = (raw.delivery as { credential?: unknown }).credential;

describe('evidenceForRequirement', () => {
	it('maps interaction-endpoint checks to raw.interaction', () => {
		for (const suffix of [
			'interaction-url-fetchable',
			'participation-endpoint',
			'tls',
			'participation-problemdetails',
			'vcapi-in-protocols'
		]) {
			expect(evidenceForRequirement(`${P}${suffix}`, raw)).toBe(raw.interaction);
		}
	});

	it('maps DID-Auth checks to raw.didAuth', () => {
		for (const suffix of ['didauth-requested', 'didauth-problemdetails']) {
			expect(evidenceForRequirement(`${P}${suffix}`, raw)).toBe(raw.didAuth);
		}
	});

	it('maps credential/proof checks to the issued credential', () => {
		for (const suffix of [
			'binds-verified-holder',
			'vcdm-2',
			'openbadge-3',
			'di-proof',
			'status-list',
			'valid-until'
		]) {
			expect(evidenceForRequirement(`${P}${suffix}`, raw)).toBe(credential);
		}
	});

	it('maps issuer-did to the credential plus the verify result', () => {
		expect(evidenceForRequirement(`${P}issuer-did`, raw)).toEqual({
			credential,
			verify: raw.verify
		});
	});

	it('returns undefined for an unmapped id', () => {
		expect(evidenceForRequirement(`${P}something-else`, raw)).toBeUndefined();
		expect(evidenceForRequirement('other.namespace.di-proof', raw)).toBeUndefined();
	});

	it('tolerates an empty raw (credential-derived slices become undefined)', () => {
		expect(evidenceForRequirement(`${P}di-proof`, {})).toBeUndefined();
		expect(evidenceForRequirement(`${P}issuer-did`, {})).toEqual({
			credential: undefined,
			verify: undefined
		});
		expect(evidenceForRequirement(`${P}tls`, {})).toBeUndefined();
	});
});
