import { issuerDidMethodCheck } from './ob3-direct-delivery-issuer.js';
import type { CheckFn } from './types.js';

/**
 * Check functions for the data-integrity-cryptosuites additive issuer
 * checklist (producer-only, direct-credential-issuance). Keys match the
 * requirement ids in
 * `src/lib/interop/additive-profiles/data-integrity-cryptosuites/issuer-direct-credential-issuance.ts`.
 *
 * This additive is the broader "either bundle cryptosuite" layer. It is
 * only evaluated when the data-integrity-cryptosuites additive is
 * selected (its group is omitted otherwise), so these checks do not gate
 * on the legacy `includeAdditive` flag.
 *
 * `key-type-matches` is intentionally left UNREGISTERED so it resolves to
 * `'n/a'`: confirming the verification-method key type against the chosen
 * cryptosuite requires DID resolution, which is out of scope for the
 * static-credential runner.
 */
export const dataIntegrityCryptosuitesIssuerChecks: Record<string, CheckFn> = {
	'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.cryptosuite-supported': ({
		credential
	}) => {
		const proofs = proofsOf(credential);
		if (proofs.length === 0) return { status: 'fail', message: '`proof` is missing.' };

		const dataIntegrityProofs = proofs.filter((p) => p.type === 'DataIntegrityProof');
		if (dataIntegrityProofs.length === 0) {
			return { status: 'fail', message: '`proof.type` MUST be `DataIntegrityProof`.' };
		}

		const matching = dataIntegrityProofs.find(
			(p) => typeof p.cryptosuite === 'string' && BUNDLE_SUITES.includes(p.cryptosuite)
		);
		if (matching) {
			return {
				status: 'pass',
				message: `proof.cryptosuite \`${matching.cryptosuite as string}\` is in the bundle.`
			};
		}

		return {
			status: 'fail',
			message:
				'`proof.cryptosuite` MUST be one of the bundle options: `eddsa-rdfc-2022` or `ecdsa-rdfc-2019`.'
		};
	},

	'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.did-method': ({
		credential
	}) => issuerDidMethodCheck(credential)

	// `key-type-matches`: left UNREGISTERED → resolves to 'n/a' (needs DID resolution).
};

// ── helpers ──────────────────────────────────────────────────────────────────

const BUNDLE_SUITES = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

/**
 * Normalize `credential.proof` to an array of proof objects. The VC Data
 * Model permits `proof` to be a single object or an array of objects;
 * non-object entries are dropped.
 */
function proofsOf(credential: unknown): Record<string, unknown>[] {
	const proof = (credential as Record<string, unknown> | null)?.proof;
	if (!proof) return [];
	const list = Array.isArray(proof) ? proof : [proof];
	return list.filter(
		(p): p is Record<string, unknown> => typeof p === 'object' && p !== null && !Array.isArray(p)
	);
}
