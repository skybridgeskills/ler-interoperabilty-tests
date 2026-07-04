import { randomInt, randomUUID } from 'node:crypto';

import {
	PassKind,
	type PassDefinition,
	type VerifierRunDefinition
} from '$lib/interop/verifier-run/index.js';
import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { buildPassCredential } from './passes/build-pass.js';

/** Injectable ordering seam so tests can make run generation deterministic. */
export type ShuffleFn = <T>(items: readonly T[]) => T[];

/** Fisher–Yates shuffle backed by `node:crypto` randomness. */
export function secureShuffle<T>(items: readonly T[]): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * Generate a direct-delivery verifier run: one pass per {@link PassKind},
 * shuffled so the opaque labels ("Credential 1".."Credential 4") betray nothing about
 * which credential is which. Stateless — the caller (ultimately the
 * operator's browser) holds the definition, ground truth included.
 */
export async function generateVerifierRun(args: {
	crypto: WalletCrypto;
	cryptosuite: WalletCryptosuite;
	shuffle?: ShuffleFn;
	newId?: () => string;
}): Promise<VerifierRunDefinition> {
	const { crypto, cryptosuite, shuffle = secureShuffle, newId = randomUUID } = args;
	const kinds = shuffle(PassKind.schema.options);
	const passes: PassDefinition[] = [];
	for (const [index, kind] of kinds.entries()) {
		// Direct delivery ships the credential up front; the holder key is dropped.
		const { credential } = await buildPassCredential(crypto, cryptosuite, kind);
		passes.push({
			passId: newId(),
			label: `Credential ${index + 1}`,
			kind,
			credential
		});
	}
	return {
		runId: newId(),
		profile: 'ob3-direct-delivery',
		workflow: 'direct-credential-verification',
		cryptosuite,
		passes
	};
}
