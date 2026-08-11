import { describe, expect, it } from 'vitest';

import { attachParamsFromUrl } from './attach-params.js';

const params = (search: string) =>
	attachParamsFromUrl(new URL(`http://localhost/wallet/credential-acceptance/vcalm${search}`));

describe('attachParamsFromUrl', () => {
	it('is empty for a plain (minting) route URL', () => {
		expect(params('')).toEqual({});
	});

	it('reads exchangeId and workflow', () => {
		expect(params('?exchangeId=ex-1&workflow=verify')).toEqual({
			exchangeId: 'ex-1',
			workflow: 'verify'
		});
	});

	it('omits workflow when it is absent or not a known workflow id', () => {
		// The page then falls back to its own direction's workflow.
		expect(params('?exchangeId=ex-1')).toEqual({ exchangeId: 'ex-1' });
		expect(params('?exchangeId=ex-1&workflow=nonsense')).toEqual({ exchangeId: 'ex-1' });
	});

	it('treats an empty exchangeId as absent, so the page stays in minting mode', () => {
		expect(params('?exchangeId=&workflow=claim')).toEqual({ workflow: 'claim' });
		expect(params('?exchangeId=%20%20')).toEqual({});
	});
});
