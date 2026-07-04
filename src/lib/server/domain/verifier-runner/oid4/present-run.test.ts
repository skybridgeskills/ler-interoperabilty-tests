import { describe, expect, it } from 'vitest';

import { PassKind, type VerifierRunPlanEntry } from '$lib/interop/verifier-run/index.js';
import type { SubmitResponse } from '$lib/server/domain/wallet-client/drivers/oid4vp-presentation.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import { PresentInputError, presentOid4Credential, type SubmitFactory } from './present-run.js';

/** A valid OID4VP request the seeded OB3 credential matches, passed inline (no fetch). */
function inlineRequest(): string {
	return JSON.stringify({
		client_id: 'https://verifier.test',
		response_uri: 'https://verifier.test/oid4vp/response',
		response_mode: 'direct_post',
		nonce: 'nonce-xyz',
		presentation_definition: {
			id: 'ob3-def',
			input_descriptors: [
				{
					id: 'ob3',
					constraints: {
						fields: [
							{
								path: ['$.type'],
								filter: { type: 'array', contains: { const: 'OpenBadgeCredential' } }
							}
						]
					}
				}
			]
		}
	});
}

function entryFor(kind: (typeof PassKind.schema.options)[number]): VerifierRunPlanEntry {
	return { passId: `pass-${kind}`, label: `Credential ${kind}`, kind };
}

/** Capturing submit factory: records the status it is told to report, then succeeds. */
function okSubmit(status = 200): SubmitFactory {
	return (onStatus) => {
		const submit: SubmitResponse = async () => {
			onStatus(status);
			return { received: true };
		};
		return submit;
	};
}

/** Rejecting submit factory: reports the status, then throws like a non-OK direct_post. */
function rejectingSubmit(status = 400): SubmitFactory {
	return (onStatus) => {
		const submit: SubmitResponse = async () => {
			onStatus(status);
			throw new Error(`OID4VP direct_post responded ${status}.`);
		};
		return submit;
	};
}

const fetchImpl = (() => {
	throw new Error('inline request must not fetch');
}) as unknown as typeof fetch;

describe('presentOid4Credential', () => {
	for (const kind of PassKind.schema.options) {
		it(`presents and submits the ${kind} credential (evidence carries the artifact + status)`, async () => {
			const crypto = WalletCrypto();
			const { evidence, activity } = await presentOid4Credential({
				entry: entryFor(kind),
				input: inlineRequest(),
				cryptosuite: 'eddsa-rdfc-2022',
				crypto,
				fetchImpl,
				submitFactory: okSubmit(200)
			});

			expect(evidence.passId).toBe(`pass-${kind}`);
			expect(evidence.submitted).toBe(true);
			expect(evidence.transportStatus).toBe(200);
			expect(evidence.credential).toBeDefined();
			expect(evidence.submissionError).toBeUndefined();
			expect(activity[0].status).toBe('ok');
		});
	}

	it('records a failed direct_post as evidence, not an error (transport 4xx)', async () => {
		const crypto = WalletCrypto();
		const { evidence, activity } = await presentOid4Credential({
			entry: entryFor('valid'),
			input: inlineRequest(),
			cryptosuite: 'eddsa-rdfc-2022',
			crypto,
			fetchImpl,
			submitFactory: rejectingSubmit(400)
		});

		expect(evidence.submitted).toBe(false);
		expect(evidence.transportStatus).toBe(400);
		expect(evidence.submissionError).toMatch(/400/);
		expect(evidence.credential).toBeDefined();
		expect(activity[0].status).toBe('fail');
	});

	it('throws PresentInputError on a malformed request (→ route 400)', async () => {
		const crypto = WalletCrypto();
		await expect(
			presentOid4Credential({
				entry: entryFor('valid'),
				input: 'not a request at all {',
				cryptosuite: 'eddsa-rdfc-2022',
				crypto,
				fetchImpl,
				submitFactory: okSubmit()
			})
		).rejects.toBeInstanceOf(PresentInputError);
	});
});
