import { describe, expect, it } from 'vitest';

import { issuanceExchangeBody, verificationExchangeBody } from './create-bodies.js';
import { ExchangeRunnerConfig } from './exchange-runner-config.js';

const config = ExchangeRunnerConfig({
	enabled: true,
	transactionServiceUrl: 'http://lits.test:4004',
	tenantName: 'default',
	tenantToken: 'shh',
	exchangeHost: 'http://lits.test:4004',
	cryptosuite: 'eddsa-rdfc-2022',
	didMethod: 'key'
});

const credential = { id: 'urn:uuid:abc', type: ['VerifiableCredential'] };

describe('issuanceExchangeBody', () => {
	it('serialises the caller’s document into `vc` — the triple-stache contract', () => {
		const body = issuanceExchangeBody(config, { retrievalId: 'r-1', credential });

		expect(JSON.parse(body.variables.vc)).toEqual(credential);
	});

	it('carries tenant and host from config, and retrievalId from the caller', () => {
		const body = issuanceExchangeBody(config, { retrievalId: 'r-1', credential });

		expect(body.variables).toMatchObject({
			tenantName: 'default',
			exchangeHost: 'http://lits.test:4004',
			retrievalId: 'r-1'
		});
	});

	it('omits tamper unless asked', () => {
		const body = issuanceExchangeBody(config, { retrievalId: 'r-1', credential });

		expect(body.variables).not.toHaveProperty('tamper');
	});

	it('sends tamper as an exchange variable when asked', () => {
		const body = issuanceExchangeBody(config, {
			retrievalId: 'r-1',
			credential,
			tamper: 'proof'
		});

		expect(body.variables).toHaveProperty('tamper', 'proof');
	});

	it('puts exchangeIdPrefix beside `variables`, never inside it', () => {
		const body = issuanceExchangeBody(config, {
			retrievalId: 'r-1',
			credential,
			exchangeIdPrefix: 'oid4-wallet-acceptance'
		});

		expect(body).toHaveProperty('exchangeIdPrefix', 'oid4-wallet-acceptance');
		expect(body.variables).not.toHaveProperty('exchangeIdPrefix');
	});

	it('omits exchangeIdPrefix entirely when absent', () => {
		const body = issuanceExchangeBody(config, { retrievalId: 'r-1', credential });

		expect(body).not.toHaveProperty('exchangeIdPrefix');
	});
});

describe('verificationExchangeBody', () => {
	it('always sends vprClaims, which the service requires as an array', () => {
		const body = verificationExchangeBody(config, {
			vprCredentialType: ['OpenBadgeCredential'],
			vprContext: ['https://example.test/ob3']
		});

		expect(body.variables.vprClaims).toEqual([]);
	});

	it('sends trustedIssuers only when present', () => {
		const base = { vprCredentialType: ['OpenBadgeCredential'], vprContext: ['https://x.test'] };

		expect(verificationExchangeBody(config, base).variables).not.toHaveProperty('trustedIssuers');
		expect(
			verificationExchangeBody(config, { ...base, trustedIssuers: ['did:key:z6M'] }).variables
		).toHaveProperty('trustedIssuers', ['did:key:z6M']);
	});
});
