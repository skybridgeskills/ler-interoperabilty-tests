import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { VerifyResult, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import type { WalletExchangeView } from '$lib/server/domain/wallet-runner/index.js';

/** A created exchange the wallet drives to completion (from the transaction service). */
export type DriverExchange = {
	exchangeId: string;
	protocols: Record<string, unknown>;
};

/** What a protocol driver returns after completing the holder side of an acceptance flow. */
export type AcceptanceResult = {
	exchange: WalletExchangeView;
	credential?: unknown;
	verify: VerifyResult;
	/** The ephemeral holder identity used (for conformance checks). */
	holder?: { did: string; cryptosuite: WalletCryptosuite };
	/** The presentation the wallet sent (e.g. the DIDAuth VP), when applicable. */
	presentation?: unknown;
};

export type AcceptanceDriverInput = {
	profile: ProfileSlug;
	cryptosuite: WalletCryptosuite;
	exchange: DriverExchange;
};

/**
 * Per-protocol holder driver. Each protocol (VCALM in M3, OID4VCI in M4, OID4VP in M5)
 * implements one and registers it with the wallet client. Drivers own the protocol HTTP +
 * crypto handshake; the wallet client owns dispatch + conformance checking.
 */
export interface ProtocolDriver {
	runAcceptance(input: AcceptanceDriverInput): Promise<AcceptanceResult>;
}
