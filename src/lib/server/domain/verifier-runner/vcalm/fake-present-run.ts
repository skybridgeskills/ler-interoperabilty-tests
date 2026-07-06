import type {
	VerifierCheckOutcome,
	VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import type { PresentVcalmResult } from './present-run.js';
import { VCALM_FLOOR_ROW_IDS } from './vpr-checks.js';

/**
 * Deterministic vcalm present result for tests + stories: no crypto, no network.
 * Every credential "submits" successfully with a canned artifact, and the five
 * floor rows resolve `pass` — enough for the wallet log and for the score
 * endpoint to light the exchange-endpoint row on the valid credential.
 */
export async function fakePresentVcalmCredential(args: {
	entry: VerifierRunPlanEntry;
	interactionUrl: string;
	cryptosuite: WalletCryptosuite;
}): Promise<PresentVcalmResult> {
	const { entry } = args;
	const floorOutcomes: VerifierCheckOutcome[] = Object.values(VCALM_FLOOR_ROW_IDS).map((id) => ({
		id,
		level: 'MUST',
		status: 'pass',
		message: 'ok',
		source: 'automated'
	}));
	return {
		evidence: {
			passId: entry.passId,
			submitted: true,
			transportStatus: 200,
			transportBody: { verified: true },
			credential: {
				'@context': ['https://www.w3.org/ns/credentials/v2'],
				type: ['VerifiableCredential', 'OpenBadgeCredential'],
				issuer: 'did:example:fake-issuer',
				credentialSubject: { id: 'did:example:fake-holder', type: 'AchievementSubject' }
			}
		},
		floorOutcomes,
		activity: [
			{
				id: `vcalm-present.${entry.passId}.submit`,
				kind: 'interaction',
				label: `Presented ${entry.label} to your verifier`,
				status: 'ok',
				detail: 'The presentation was submitted to the exchange.'
			}
		]
	};
}
