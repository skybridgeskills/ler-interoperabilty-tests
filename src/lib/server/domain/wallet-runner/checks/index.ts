import type { WalletCheckFn } from '../wallet-check.js';

import { dataIntegrityAcceptanceChecks } from './data-integrity-acceptance.js';
import { dataIntegrityPresentationChecks } from './data-integrity-presentation.js';

/**
 * Map from requirement-id → automated wallet check fn. Mirrors the issuer-runner's
 * `checkRegistry`: the exchange-checker looks requirements up by their stable `id` and falls
 * back to `'n/a'` for ids without a registered function (partial coverage is safe).
 *
 * The `data-integrity-cryptosuites` acceptance checks cover VCALM (M3) + OID4VCI (M4); the
 * presentation checks cover OID4VP (M5).
 */
export const walletCheckRegistry: Record<string, WalletCheckFn> = {
	...dataIntegrityAcceptanceChecks,
	...dataIntegrityPresentationChecks
};

export type { WalletCheckCtx, WalletCheckFn, WalletExchangeView } from '../wallet-check.js';
