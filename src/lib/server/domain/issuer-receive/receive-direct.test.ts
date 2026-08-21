import { describe, expect, it, vi } from 'vitest';

import { receiveDirect } from './receive-direct.js';
import { ReceiveInputError } from './receive-input-error.js';

const CREDENTIAL = {
	'@context': ['https://www.w3.org/ns/credentials/v2'],
	type: ['VerifiableCredential', 'OpenBadgeCredential']
};

const verifies = async () => ({ verified: true });

describe('receiveDirect', () => {
	it('parses the paste, verifies it, and returns the credential as the artifact', async () => {
		const result = await receiveDirect({ input: JSON.stringify(CREDENTIAL), verify: verifies });
		expect(result.delivered).toBe(true);
		expect(result.credential).toEqual(CREDENTIAL);
		expect(result.flow).toEqual({ transport: 'direct', verified: true });
	});

	it('tolerates surrounding whitespace', async () => {
		const result = await receiveDirect({
			input: `\n  ${JSON.stringify(CREDENTIAL)}  \n`,
			verify: verifies
		});
		expect(result.delivered).toBe(true);
	});

	it('records a credential that does not verify — delivered, with the reasons', async () => {
		const result = await receiveDirect({
			input: JSON.stringify(CREDENTIAL),
			verify: async () => ({ verified: false, errors: ['signature invalid'] })
		});
		expect(result.delivered).toBe(true);
		expect(result.flow).toMatchObject({ verified: false, verifyErrors: ['signature invalid'] });
	});

	it('supplies a reason when the verifier reports none', async () => {
		const result = await receiveDirect({
			input: JSON.stringify(CREDENTIAL),
			verify: async () => ({ verified: false })
		});
		expect(result.flow.verifyErrors).toEqual(['The credential did not verify.']);
	});

	it('scores — does not throw — when the verifier itself throws', async () => {
		const result = await receiveDirect({
			input: JSON.stringify(CREDENTIAL),
			verify: async () => {
				throw new Error('verifier-core exploded');
			}
		});
		expect(result.delivered).toBe(true);
		expect(result.flow.verified).toBe(false);
		expect(result.flow.verifyErrors).toEqual(['verifier-core exploded']);
	});

	it('throws ReceiveInputError on a blank paste', async () => {
		await expect(receiveDirect({ input: '   ', verify: verifies })).rejects.toBeInstanceOf(
			ReceiveInputError
		);
	});

	it('throws ReceiveInputError on non-JSON', async () => {
		await expect(
			receiveDirect({ input: 'the credential is attached', verify: verifies })
		).rejects.toBeInstanceOf(ReceiveInputError);
	});

	it('throws ReceiveInputError on JSON that is not an object', async () => {
		for (const input of ['[]', '"a string"', '42', 'null']) {
			await expect(receiveDirect({ input, verify: verifies })).rejects.toBeInstanceOf(
				ReceiveInputError
			);
		}
	});

	it('does not call the verifier when the input cannot be parsed', async () => {
		const verify = vi.fn(verifies);
		await expect(receiveDirect({ input: 'nope', verify })).rejects.toBeInstanceOf(
			ReceiveInputError
		);
		expect(verify).not.toHaveBeenCalled();
	});
});
