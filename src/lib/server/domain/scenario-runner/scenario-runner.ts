import type { ReceiveFromIssuerResult } from '$lib/server/domain/issuer-receive/index.js';
import type {
	PresentToOid4Result,
	PresentToVcalmResult
} from '$lib/server/domain/verifier-present/index.js';
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
 * the operator's run-time input (a VC-API interaction URL for `'vcalm'`, or a
 * pasted OID4VP authorization request for `'oid4vp'`). `transport` is the seam
 * the live transports slot into — `'vcalm'` (M10a) and `'oid4vp'` (M10b).
 */
export type PresentFn = (args: {
	doc: Record<string, unknown>;
	cryptosuite: WalletCryptosuite;
	tamper?: 'proof' | 'claim';
	transport: 'vcalm' | 'oid4vp';
	interactionUrl: string;
}) => Promise<PresentToVcalmResult | PresentToOid4Result>;

/**
 * Receive one credential from the operator's issuer, for a
 * `receive-from-issuer` step. `input` is the operator's run-time paste — a
 * credential JSON for `'direct'`, a VC-API interaction URL for `'vcalm'`, an
 * `openid-credential-offer://` URL for `'oid4vci'`. `keyProofSuite` is the
 * cryptosuite the suite's **own** test wallet signs its holder key proof with
 * (`'direct'` has no key proof and ignores it); it is generated locally, so it
 * is always servable and is not an `IssuingIntent`.
 */
export type ReceiveFn = (args: {
	transport: 'direct' | 'vcalm' | 'oid4vci';
	keyProofSuite: WalletCryptosuite;
	input: string;
}) => Promise<ReceiveFromIssuerResult>;

/**
 * The scenario-runner's server surface — the scenario actions the transaction
 * service does not mint:
 *
 * - **`deliverDirect`** signs a credential for a `deliver-direct` step (no
 *   exchange); the suite is the issuer.
 * - **`present`** presents a credential to the operator's verifier for a
 *   `present-to-verifier` step (a live VC-API exchange the *operator* drives);
 *   the suite is the holder.
 * - **`receive`** receives a credential from the operator's issuer for a
 *   `receive-from-issuer` step — a paste, or a live exchange the *operator's
 *   issuer* drives; the suite is the recipient.
 *
 * `issue` and `request-presentation` still flow through the exchange-runner and
 * the transaction service.
 */
export type ScenarioRunner = {
	deliverDirect: DeliverDirectFn;
	present: PresentFn;
	receive: ReceiveFn;
};
