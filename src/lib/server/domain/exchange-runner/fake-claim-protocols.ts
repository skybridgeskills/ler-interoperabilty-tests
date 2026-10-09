/**
 * VC-API `claim`-workflow protocols envelope the fake returns. Mirrors the real
 * service's issuance protocols: the interaction URL, the VC-API exchange
 * endpoint, an LCW deep link, the OID4VCI 1.0 pre-authorized-code offer link,
 * and a `DIDAuthentication` presentation request.
 *
 * Shared by `createIssuanceExchange` and `getProtocols` so an exchange adopted
 * by id (attach mode) presents exactly the links its mint returned.
 */
export function fakeClaimProtocols(host: string, exchangeId: string) {
	const credentialOfferUri = `${host}/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`;
	return {
		iu: `${host}/interactions/${exchangeId}`,
		vcapi: `${host}/workflows/claim/exchanges/${exchangeId}`,
		lcw: `${host}/lcw?xid=${exchangeId}`,
		OID4VCI: `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(
			credentialOfferUri
		)}`,
		verifiablePresentationRequest: {
			query: { type: 'DIDAuthentication' },
			challenge: `challenge-${exchangeId}`,
			domain: host
		}
	};
}
