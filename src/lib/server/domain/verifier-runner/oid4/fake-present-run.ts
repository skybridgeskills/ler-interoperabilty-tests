import type { VerifierRunPlanEntry } from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import type { PresentOid4Result } from './present-run.js';

/**
 * Deterministic present result for tests + stories: no crypto, no network.
 * Every kind "submits" successfully with a stable canned credential artifact
 * and a single narrated activity entry — enough for the wallet log and for the
 * score endpoint to light the response-endpoint row on the valid credential.
 */
export async function fakePresentOid4Credential(args: {
	entry: VerifierRunPlanEntry;
	input: string;
	cryptosuite: WalletCryptosuite;
}): Promise<PresentOid4Result> {
	const { entry } = args;
	return {
		evidence: {
			passId: entry.passId,
			submitted: true,
			transportStatus: 200,
			transportBody: { status: 'accepted' },
			credential: {
				'@context': ['https://www.w3.org/ns/credentials/v2'],
				type: ['VerifiableCredential', 'OpenBadgeCredential'],
				issuer: 'did:example:fake-issuer',
				credentialSubject: { id: 'did:example:fake-holder', type: 'AchievementSubject' }
			}
		},
		activity: [
			{
				id: `oid4-present.${entry.passId}.submit`,
				kind: 'interaction',
				label: `Presented ${entry.label} to your verifier`,
				status: 'ok',
				detail: 'The presentation was submitted to the response endpoint.'
			}
		]
	};
}
