import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Sign one recipe document for a `deliver-direct` step, optionally tampered.
 * Returns the signed (and optionally corrupted) credential the operator
 * downloads and hands to the system under test.
 */
export type DeliverDirectFn = (args: {
	doc: Record<string, unknown>;
	cryptosuite: WalletCryptosuite;
	tamper?: 'proof' | 'claim';
}) => Promise<unknown>;

/**
 * The scenario-runner's server surface.
 *
 * Today it is exactly the **deliver-direct signer** — the one scenario action
 * the transaction service does not mint. `issue` and `request-presentation`
 * still flow through the exchange-runner and the transaction service; a
 * `deliver-direct` step mints no exchange, so the suite signs it here.
 */
export type ScenarioRunner = {
	deliverDirect: DeliverDirectFn;
};
