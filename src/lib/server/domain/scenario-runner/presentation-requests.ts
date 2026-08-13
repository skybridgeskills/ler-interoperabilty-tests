import type { DcqlClaim } from '../exchange-runner/transaction-service-client.js';

import { ob3Any } from './requests/ob3-any.js';

/**
 * A named presentation request a scenario can ask the verify workflow to mint.
 *
 * The presentation side is already well parameterised upstream — `vprContext`,
 * `vprCredentialType`, `vprClaims` (path/values pairs), `trustedIssuers` and
 * the DCQL-versus-PEX query language are all exchange variables — so a request
 * is plain data here too.
 */
export type PresentationRequest = {
	id: string;
	/** One line, for authoring and for a scenario step's setup copy. */
	summary: string;
	vprCredentialType: string[];
	vprContext: string[];
	trustedIssuers?: string[];
	vprClaims?: DcqlClaim[];
};

/** Every presentation request a scenario may name, keyed by id. */
export const presentationRequests: Record<string, PresentationRequest> = {
	[ob3Any.id]: ob3Any
};

/**
 * Resolve a request id, or `undefined` when nothing is registered under it.
 * Callers at a request boundary turn `undefined` into a typed 400.
 */
export function requestById(id: string): PresentationRequest | undefined {
	return presentationRequests[id];
}

/** Every registered request id, for error messages and authoring tools. */
export function allRequestIds(): string[] {
	return Object.keys(presentationRequests);
}
