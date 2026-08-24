import type { CheckResult } from '../automatic-checks.js';

import { proofOf } from './credential-shape.js';

/** The two Data Integrity cryptosuites the `data-integrity-cryptosuites` bundle covers. */
export const CRYPTOSUITE_BUNDLE = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'] as const;

/**
 * The shared Data Integrity proof check, parameterised by which cryptosuites
 * count. Ported from the direct page's `data-integrity-eddsa-rdfc-2022` row and
 * the live pages' `di-proof` row — the same four assertions in both (a
 * `DataIntegrityProof`, an accepted `cryptosuite`, a parseable `created`, a
 * `verificationMethod`), differing only in the accepted set.
 *
 * Three callers: `credential-di-proof-eddsa` and `credential-di-proof-ecdsa` pin
 * one suite each (the base direct scenario and the DIC producer scenarios);
 * `credential-di-proof-bundle` accepts either (the two live base scenarios,
 * whose profiles fix no suite of their own).
 */
export function diProofResult(
	artifactCredential: Record<string, unknown> | undefined,
	accepted: readonly string[],
	noCredentialDetail: string
): CheckResult {
	if (!artifactCredential) return { met: false, detail: noCredentialDetail };
	const proof = proofOf(artifactCredential);
	if (!proof) return { met: false, detail: 'The credential carries no `proof`.' };
	if (proof.type !== 'DataIntegrityProof') {
		return { met: false, detail: '`proof.type` must be `DataIntegrityProof`.' };
	}
	const suite = proof.cryptosuite;
	if (typeof suite !== 'string' || !accepted.includes(suite)) {
		return {
			met: false,
			detail: `\`proof.cryptosuite\` is ${typeof suite === 'string' ? `\`${suite}\`` : 'missing'} — this requires ${accepted.map((s) => `\`${s}\``).join(' or ')}.`
		};
	}
	if (typeof proof.created !== 'string' || Number.isNaN(Date.parse(proof.created))) {
		return { met: false, detail: '`proof.created` must be an ISO date string.' };
	}
	if (typeof proof.verificationMethod !== 'string') {
		return { met: false, detail: '`proof.verificationMethod` must be a string.' };
	}
	return {
		met: true,
		detail: `The credential carries a \`${suite}\` DataIntegrityProof with a creation date and a verification method.`
	};
}
