import { describe, expect, it } from 'vitest';

import { cannotServeMessage } from './issuing-context.js';

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
