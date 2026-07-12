import { type ExchangeStore, newUuid, requireRecord } from './fake-transaction-service-shared.js';
import type { ExchangeRecord } from './transaction-service-client.js';

/**
 * OID4VCI advance hooks for the fake client. Mirrors the real dcc service,
 * which records OID4VCI runtime state under `variables.oid4vci` and only
 * flips to `complete` at the credential endpoint. Kept in its own module so
 * the fake client factory stays small.
 */
export function oid4vciHooks(store: ExchangeStore) {
	function patchOid4vci(
		exchangeId: string,
		patch: Record<string, unknown>,
		state?: ExchangeRecord['state']
	): void {
		const record = requireRecord(store, exchangeId);
		const priorVars = record.variables ?? {};
		const priorOid4vci = (priorVars.oid4vci as Record<string, unknown> | undefined) ?? {};
		store.set(exchangeId, {
			...record,
			...(state ? { state } : {}),
			variables: {
				...priorVars,
				oid4vci: { ...priorOid4vci, ...patch }
			}
		});
	}

	return {
		/**
		 * OID4VCI: wallet fetched the credential offer → pre-auth code minted.
		 * State stays `pending` (mirrors the real service).
		 */
		advanceOid4vciOfferFetched(exchangeId: string): void {
			patchOid4vci(exchangeId, { preAuthorizedCode: `fake-preauth-${newUuid()}` });
		},
		/** OID4VCI: token endpoint redeemed the code → access token issued (still `pending`). */
		advanceOid4vciTokenIssued(exchangeId: string): void {
			patchOid4vci(exchangeId, { codeUsed: true, accessToken: `fake-access-${newUuid()}` });
		},
		/** OID4VCI: nonce endpoint issued a c_nonce, credential request imminent (still `pending`). */
		advanceOid4vciNonceIssued(exchangeId: string): void {
			patchOid4vci(exchangeId, { cNonce: `fake-cnonce-${newUuid()}` });
		},
		/** OID4VCI: credential endpoint issued the VC → exchange `complete`. */
		advanceOid4vciComplete(exchangeId: string, vars: Record<string, unknown> = {}): void {
			const record = requireRecord(store, exchangeId);
			const priorVars = record.variables ?? {};
			const priorOid4vci = (priorVars.oid4vci as Record<string, unknown> | undefined) ?? {};
			store.set(exchangeId, {
				...record,
				state: 'complete',
				variables: {
					...priorVars,
					...vars,
					oid4vci: { ...priorOid4vci, nonceUsed: true }
				}
			});
		}
	};
}
