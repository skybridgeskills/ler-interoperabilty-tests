import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { CheckResult } from '$lib/server/domain/issuer-runner/checks/index.js';
import type { VerifyResult, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/** The exchange view the wallet checks reason over (protocol-agnostic). */
export type WalletExchangeView = {
	state: 'pending' | 'active' | 'complete' | 'invalid';
	variables?: Record<string, unknown>;
};

/**
 * Context handed to each wallet conformance check. Mirrors the issuer-runner's `CheckCtx`, but
 * reasons over an exchange + what the wallet observed during the holder flow rather than a
 * pasted credential:
 *
 * - `exchange` — the final exchange record/state.
 * - `credential` — the issued VC the wallet received (acceptance flows), if any.
 * - `presentation` — the VP the wallet built (presentation flows), if any.
 * - `verify` — the wallet-crypto verification result of the credential/presentation.
 */
export type WalletCheckCtx = {
	profile: ProfileSlug;
	exchange: WalletExchangeView;
	credential?: unknown;
	presentation?: unknown;
	verify: VerifyResult;
	/** The ephemeral holder identity the wallet used (DID + cryptosuite), when known. */
	holder?: { did: string; cryptosuite: WalletCryptosuite };
};

/** A wallet check fn — the checker adds `id` + `level` (same contract as issuer-runner). */
export type WalletCheckFn = (ctx: WalletCheckCtx) => CheckResult;
