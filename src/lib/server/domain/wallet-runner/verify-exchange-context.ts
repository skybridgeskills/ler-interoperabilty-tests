import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import type { WalletCheckCtx, WalletExchangeView } from './wallet-check.js';

/**
 * The folded verifier-core `VerificationResult` the transaction service exposes
 * at `variables.results.default`. Only the fields the black-box wallet checks
 * read are modelled; everything else is passthrough.
 */
export type VerificationResultView = {
	verified?: boolean;
	verifiablePresentation?: unknown;
	presentationResults?: unknown[];
	credentialResults?: { verified?: boolean }[];
	summary?: unknown[];
};

/**
 * Build a {@link WalletCheckCtx} for a REAL operator wallet from an observed
 * `verify` exchange — NOT from the suite's own test wallet. The holder identity
 * and presentation are derived purely from the echoed VP in
 * `variables.results.default`:
 *
 * - `presentation` := `results.default.verifiablePresentation`
 * - `holder.did`  := `vp.holder`; `holder.cryptosuite` := `vp.proof.cryptosuite`
 * - `credential`  := `undefined` — there is no original operator VC to diff, so
 *   `preserve-vc-proofs` uses its presence-only branch (the honest black-box signal).
 * - `verify.verified` := `results.default.verified` (verifier-core's verdict).
 *
 * When the exchange has no echoed VP (e.g. never delivered), `presentation` and
 * `holder` are left undefined so the checks resolve to `n/a`, not a spurious fail.
 */
export function verifyExchangeContext(
	exchange: WalletExchangeView,
	profile: ProfileSlug
): WalletCheckCtx {
	const result = resultsDefaultOf(exchange);
	const vp = result?.verifiablePresentation;
	const cryptosuite = proofCryptosuiteOf(vp);
	const holderDid = holderDidOf(vp);

	return {
		profile,
		exchange,
		credential: undefined,
		presentation: vp,
		verify: { verified: !!result?.verified, cryptosuite },
		holder:
			holderDid && cryptosuite
				? { did: holderDid, cryptosuite: cryptosuite as WalletCryptosuite }
				: undefined
	};
}

/** Read `variables.results.default` (the folded `VerificationResult`), if present. */
export function resultsDefaultOf(exchange: WalletExchangeView): VerificationResultView | undefined {
	const results = exchange.variables?.results as { default?: VerificationResultView } | undefined;
	return results?.default;
}

/** The VP's data-integrity `proof` (first, when an array of proofs). */
export function vpProofOf(presentation: unknown): Record<string, unknown> | undefined {
	const proof = (presentation as { proof?: unknown })?.proof;
	const first = Array.isArray(proof) ? proof[0] : proof;
	return first && typeof first === 'object' ? (first as Record<string, unknown>) : undefined;
}

function proofCryptosuiteOf(presentation: unknown): string | undefined {
	const cs = vpProofOf(presentation)?.cryptosuite;
	return typeof cs === 'string' ? cs : undefined;
}

function holderDidOf(presentation: unknown): string | undefined {
	const holder = (presentation as { holder?: unknown })?.holder;
	if (typeof holder === 'string') return holder;
	if (holder && typeof holder === 'object') {
		const id = (holder as { id?: unknown }).id;
		return typeof id === 'string' ? id : undefined;
	}
	return undefined;
}
