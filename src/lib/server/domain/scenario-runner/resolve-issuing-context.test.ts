import { describe, expect, it } from 'vitest';

import { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import { cannotServeMessage, resolveIssuingContext } from './resolve-issuing-context.js';

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
});

describe('cannotServeMessage', () => {
	it('names the axis and what is available', () => {
		const message = cannotServeMessage({
			kind: 'cryptosuite-unavailable',
			requested: 'bbs-2023',
			available: ['eddsa-rdfc-2022']
		});

		expect(message).toContain('cryptosuite');
		expect(message).toContain('bbs-2023');
		expect(message).toContain('eddsa-rdfc-2022');
	});

	it('says “DID method” for the DID-method case', () => {
		const message = cannotServeMessage({
			kind: 'did-method-unavailable',
			requested: 'web',
			available: ['key']
		});

		expect(message).toContain('DID method');
	});
});
