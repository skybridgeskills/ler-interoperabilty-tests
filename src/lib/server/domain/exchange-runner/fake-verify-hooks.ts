import { minimalOpenBadgeCredential } from '../credential-fixtures/minimal-open-badge-credential.js';

import { type ExchangeStore, newUuid, requireRecord } from './fake-transaction-service-shared.js';

/**
 * VC-API `verify`-workflow protocols envelope the fake returns from
 * `createVerificationExchange`. Mirrors the real service's presentation
 * request: a `QueryByExample` for the requested credential type plus a
 * `DIDAuthentication` query, with a server-minted `challenge`/`domain`.
 * No `OID4VCI` field — that belongs to the issuance path.
 */
export function fakeVerifyProtocols(host: string, exchangeId: string, credentialType: string[]) {
	const serviceEndpoint = `${host}/workflows/verify/exchanges/${exchangeId}`;
	return {
		iu: `${host}/interactions/${exchangeId}`,
		vcapi: serviceEndpoint,
		lcw: `${host}/lcw?xid=${exchangeId}`,
		verifiablePresentationRequest: {
			query: [
				{ type: 'QueryByExample', credentialQuery: { example: { type: credentialType } } },
				{ type: 'DIDAuthentication' }
			],
			challenge: `challenge-${exchangeId}`,
			domain: serviceEndpoint
		}
	};
}

/** A minimal DID-Auth VP echoing the OB3 fixture credential, for `results.default`. */
function defaultVerifiablePresentation(): Record<string, unknown> {
	return {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiablePresentation'],
		holder: 'did:key:zFakeHolder',
		verifiableCredential: minimalOpenBadgeCredential({
			issuerDid: 'did:key:zFakeIssuer',
			holderDid: 'did:key:zFakeHolder'
		})
	};
}

/**
 * Verify-lifecycle advance hooks for the fake client. Together they walk a
 * verify exchange through the deterministic real-service sequence:
 * `pending` → `active` (+ a queued `verifyTask`, the async Open Badges pass
 * window) → `complete`/`invalid` with a populated `variables.results.default`.
 */
export function verifyHooks(store: ExchangeStore) {
	return {
		/**
		 * Sync pass found an Open Badges credential: hold at `active` with a
		 * queued `verifyTask` while the async OB pass runs (two-phase window).
		 */
		advanceVerifyToActive(
			exchangeId: string,
			opts: { openBadgesCredentialIndices?: number[] } = {}
		): void {
			const record = requireRecord(store, exchangeId);
			const now = new Date();
			store.set(exchangeId, {
				...record,
				state: 'active',
				variables: {
					...(record.variables ?? {}),
					verifyTask: {
						attemptId: newUuid(),
						queuedAt: now.toISOString(),
						deadlineAt: new Date(now.getTime() + 30_000).toISOString(),
						attempt: 1,
						maxAttempts: 3,
						openBadgesCredentialIndices: opts.openBadgesCredentialIndices ?? [0],
						status: 'queued'
					}
				}
			});
		},
		/**
		 * Async pass settled: finalize to `complete` (or `invalid` when
		 * `verified: false`) with `results.default` populated the way the real
		 * `applyVerificationResults` does — `verified`, echoed
		 * `verifiablePresentation`, and a `summary[]`.
		 */
		advanceVerifyToComplete(
			exchangeId: string,
			opts: {
				verified?: boolean;
				verifiablePresentation?: Record<string, unknown>;
				summary?: unknown[];
			} = {}
		): void {
			const record = requireRecord(store, exchangeId);
			const verified = opts.verified ?? true;
			const priorVars = record.variables ?? {};
			const priorTask = priorVars.verifyTask as Record<string, unknown> | undefined;
			store.set(exchangeId, {
				...record,
				state: verified ? 'complete' : 'invalid',
				variables: {
					...priorVars,
					...(priorTask ? { verifyTask: { ...priorTask, status: 'succeeded' } } : {}),
					results: {
						default: {
							verified,
							verifiablePresentation:
								opts.verifiablePresentation ?? defaultVerifiablePresentation(),
							summary: opts.summary ?? [
								{ message: verified ? 'All checks passed' : 'Verification failed', valid: verified }
							]
						}
					}
				}
			});
		}
	};
}
