import type { PresentToVcalmResult } from '$lib/server/domain/verifier-present/index.js';
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
 * Present one recipe credential to the operator's verifier over a live exchange,
 * for a `present-to-verifier` step. The suite is the holder; `interactionUrl` is
 * the operator's run-time input. `transport` is the seam OID4VP slots into
 * (M10b); M10a serves `'vcalm'` only.
 */
export type PresentFn = (args: {
	doc: Record<string, unknown>;
	cryptosuite: WalletCryptosuite;
	tamper?: 'proof' | 'claim';
	transport: 'vcalm';
	interactionUrl: string;
}) => Promise<PresentToVcalmResult>;

/**
 * The scenario-runner's server surface — the scenario actions the transaction
 * service does not mint:
 *
 * - **`deliverDirect`** signs a credential for a `deliver-direct` step (no
 *   exchange); the suite is the issuer.
 * - **`present`** presents a credential to the operator's verifier for a
 *   `present-to-verifier` step (a live VC-API exchange the *operator* drives);
 *   the suite is the holder.
 *
 * `issue` and `request-presentation` still flow through the exchange-runner and
 * the transaction service.
 */
export type ScenarioRunner = {
	deliverDirect: DeliverDirectFn;
	present: PresentFn;
};
