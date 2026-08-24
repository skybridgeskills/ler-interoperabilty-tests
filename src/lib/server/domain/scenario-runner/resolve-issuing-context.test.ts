import { describe, expect, it } from 'vitest';

import { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import { resolveIssuingContext } from './resolve-issuing-context.js';

const config = ExchangeRunnerConfig({
	enabled: true,
	transactionServiceUrl: 'http://lits.test:4004',
	tenantName: 'default',
	tenantToken: 'shh',
	exchangeHost: 'http://lits.test:4004',
	cryptosuite: 'eddsa-rdfc-2022',
	didMethod: 'key'
});

describe('resolveIssuingContext', () => {
	it('serves an absent intent — elective always resolves', () => {
		const result = resolveIssuingContext(config);

		expect(result).toEqual({
			ok: true,
			tenantName: 'default',
			tenantToken: 'shh',
			cryptosuite: 'eddsa-rdfc-2022',
			didMethod: 'key'
		});
	});

	it('serves a pin matching what the deployment advertises', () => {
		const result = resolveIssuingContext(config, {
			cryptosuite: 'eddsa-rdfc-2022',
			didMethod: 'key'
		});

		expect(result.ok).toBe(true);
	});

	it('refuses a cryptosuite the deployment does not serve, naming what it has', () => {
		const result = resolveIssuingContext(config, { cryptosuite: 'bbs-2023', didMethod: 'key' });

		expect(result).toEqual({
			ok: false,
			reason: {
				kind: 'cryptosuite-unavailable',
				requested: 'bbs-2023',
				available: ['eddsa-rdfc-2022']
			}
		});
	});

	it('refuses a DID method the deployment does not serve', () => {
		const result = resolveIssuingContext(config, {
			cryptosuite: 'eddsa-rdfc-2022',
			didMethod: 'web'
		});

		expect(result).toEqual({
			ok: false,
			reason: { kind: 'did-method-unavailable', requested: 'web', available: ['key'] }
		});
	});

	it('reports the cryptosuite first when both axes mismatch', () => {
		const result = resolveIssuingContext(config, { cryptosuite: 'bbs-2023', didMethod: 'web' });

		expect(result.ok === false && result.reason.kind).toBe('cryptosuite-unavailable');
	});

	it('follows the deployment when its advertised pair changes', () => {
		const webConfig = ExchangeRunnerConfig({ ...config, didMethod: 'web' });

		expect(
			resolveIssuingContext(webConfig, { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'web' }).ok
		).toBe(true);
	});

	describe('across a multi-tenant deployment', () => {
		// Pinning a cryptosuite is a TENANT SWAP: the transaction service picks its
		// issuer instance at claim time from the suites the wallet advertised, so
		// the only way to force one is to mint under a tenant offering it alone.
		const multi = ExchangeRunnerConfig({
			...config,
			tenants: [
				{ name: 'default', token: 'shh', cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' },
				{ name: 'ecdsa', token: 'shh-ecdsa', cryptosuite: 'ecdsa-rdfc-2019', didMethod: 'key' }
			]
		});

		it('returns the SECOND tenant’s token for a pin only it serves', () => {
			// The assertion the whole tenant map exists for: a different token, which
			// is the entirety of how the exchange gets minted under a different suite.
			expect(
				resolveIssuingContext(multi, { cryptosuite: 'ecdsa-rdfc-2019', didMethod: 'key' })
			).toEqual({
				ok: true,
				tenantName: 'ecdsa',
				tenantToken: 'shh-ecdsa',
				cryptosuite: 'ecdsa-rdfc-2019',
				didMethod: 'key'
			});
		});

		it('still serves an elective scenario from the default tenant', () => {
			expect(resolveIssuingContext(multi)).toMatchObject({ ok: true, tenantName: 'default' });
		});

		it('lists every available cryptosuite when none matches', () => {
			expect(resolveIssuingContext(multi, { cryptosuite: 'bbs-2023', didMethod: 'key' })).toEqual({
				ok: false,
				reason: {
					kind: 'cryptosuite-unavailable',
					requested: 'bbs-2023',
					available: ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']
				}
			});
		});

		it('blames the DID method, and lists only the methods serving that suite', () => {
			// Naming the wrong axis would send an operator to the wrong config: this
			// deployment DOES serve ecdsa, just not over did:web.
			expect(
				resolveIssuingContext(multi, { cryptosuite: 'ecdsa-rdfc-2019', didMethod: 'web' })
			).toEqual({
				ok: false,
				reason: { kind: 'did-method-unavailable', requested: 'web', available: ['key'] }
			});
		});
	});

	it('falls back to the top-level fields when no tenant list is configured', () => {
		// Every fake and test context builds a config by hand without a list. Absent
		// means one tenant: this one — read in exactly one place so the fallback
		// cannot become a second source of truth.
		expect(config.tenants).toBeUndefined();
		expect(resolveIssuingContext(config)).toMatchObject({
			tenantName: 'default',
			tenantToken: 'shh'
		});
	});
});
