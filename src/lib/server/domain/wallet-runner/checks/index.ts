import type { WalletCheckFn } from '../wallet-check.js';

import { dataIntegrityAcceptanceChecks } from './data-integrity-acceptance.js';

/**
 * Map from requirement-id → automated wallet check fn. Mirrors the issuer-runner's
 * `checkRegistry`: the exchange-checker looks requirements up by their stable `id` and falls
 * back to `'n/a'` for ids without a registered function (partial coverage is safe).
 *
 * The `data-integrity-cryptosuites` acceptance checks are protocol-agnostic and cover both
 * VCALM (M3) and OID4VCI (M4). M5 adds the OID4VP presentation checks.
 */
export const walletCheckRegistry: Record<string, WalletCheckFn> = {
	...dataIntegrityAcceptanceChecks
};

export type { WalletCheckCtx, WalletCheckFn, WalletExchangeView } from '../wallet-check.js';
