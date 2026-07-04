import { randomUUID } from 'node:crypto';

import {
	PassKind,
	type VerifierRunPlan,
	type VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { secureShuffle, type ShuffleFn } from '../generate-run.js';

/**
 * Generate a credential-less oid4 verifier run plan: one entry per
 * {@link PassKind}, shuffled so the opaque labels ("Credential 1".."Credential 4")
 * betray nothing about which credential is which. No crypto runs here —
 * fixtures are generated server-side at present time, per credential.
 * Stateless: the client holds the plan and posts it back for presenting
 * and scoring.
 */
export function generateOid4Plan(args: {
	cryptosuite: WalletCryptosuite;
	shuffle?: ShuffleFn;
	newId?: () => string;
}): VerifierRunPlan {
	const { cryptosuite, shuffle = secureShuffle, newId = randomUUID } = args;
	const kinds = shuffle(PassKind.schema.options);
	const entries: VerifierRunPlanEntry[] = kinds.map((kind, index) => ({
		passId: newId(),
		label: `Credential ${index + 1}`,
		kind
	}));
	return {
		runId: newId(),
		profile: 'oid4',
		workflow: 'credential-request-and-verification',
		cryptosuite,
		entries
	};
}
