import { Scenario } from './scenario-schema.js';

/**
 * The OID4VCI **issuer** scenario — the operator's issuer publishes a
 * pre-authorized-code credential offer, the suite redeems it as a wallet would,
 * and the credential that comes back is measured on the wire and in the payload.
 *
 * Fifteen requirements: the eight the OID4VCI wire answers, the shared holder
 * binding, then the six shared `credential-*` payload rows. That is fifteen rows
 * against the engine's fifteen ids — `tls-credential` merged into `tls` (the same
 * probe over the same host under a second id) and `binds-verified-holder`
 * counted once. The arithmetic is in `mapping.md` § 3.
 *
 * **Pure-automatic**, as the VCALM issuer scenario is. Two rows carry the
 * engine's honesty caveats verbatim in substance: neither the credential
 * endpoint's error handling nor the rejection of a malformed key proof is
 * negatively probed, and their messages say so.
 *
 * The profile standardises OID4VCI issuance on the **pre-authorized-code** flow
 * — there are no authorization-code clauses, and the copy does not imply
 * otherwise.
 */
export const oid4IssuerIssuance = Scenario({
	slug: 'oid4-issuer-issuance',
	name: 'Issue a credential to us over OID4VCI',
	blurb:
		'Publish a pre-authorized-code credential offer on your issuer and give us the offer URL. We redeem it as a wallet would and check both the protocol and the credential.',
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'issue',
			title: 'Issue a credential to us over OID4VCI',
			summary:
				'Generate a pre-authorized-code credential offer on your own issuer and paste its `openid-credential-offer://` URL below. We will read your metadata, redeem the code, present a Data Integrity key proof, and take delivery.',
			action: {
				kind: 'receive-from-issuer',
				transport: 'oid4vci',
				keyProofSuite: 'eddsa-rdfc-2022'
			},
			requirements: [
				{
					id: 'metadata-endpoint',
					statement:
						'Your credential-issuer metadata was reachable and named a credential endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-metadata-endpoint' }
				},
				{
					id: 'di-vp-proof-type',
					statement: 'Your issuer metadata advertised a `di_vp` key-proof type.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-di-vp-proof-type' }
				},
				{
					id: 'di-vp-signing-algs',
					statement: 'Your `di_vp` signing algorithms included a supported cryptosuite.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-di-vp-signing-algs' }
				},
				{
					id: 'not-jwt-only',
					statement: 'Your issuer did not require a JWT-only key proof.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-not-jwt-only-proof' }
				},
				{
					id: 'tls',
					statement: 'Your issuer’s endpoints used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-tls' }
				},
				{
					id: 'pre-auth-code',
					statement: 'Your token endpoint accepted the pre-authorized-code grant.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-pre-authorized-code' }
				},
				{
					id: 'credential-endpoint',
					statement: 'Your credential endpoint delivered a credential to our authorised request.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-credential-endpoint' }
				},
				{
					id: 'di-vp-accepted',
					statement: 'Your issuer accepted our Data Integrity key proof.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-di-vp-accepted' }
				},
				{
					id: 'binds-holder',
					statement: 'Your issuer bound the credential to the DID in our key proof.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'issuer-binds-holder-did' }
				},
				{
					id: 'vcdm2',
					statement: 'Your credential declares the VC Data Model 2.0 context and type.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-vcdm2' }
				},
				{
					id: 'ob3-type',
					statement: 'Your credential’s `type` includes `OpenBadgeCredential`.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-ob3-type' }
				},
				{
					id: 'di-proof',
					statement: 'Your issuer signed the credential with a supported Data Integrity suite.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-di-proof-bundle' }
				},
				{
					id: 'status-list',
					statement: 'Your credential carries a Bitstring Status List entry.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-status-list' }
				},
				{
					id: 'issuer-did',
					statement: 'Your issuer’s DID uses a supported method and the credential verifies.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-issuer-did' }
				},
				{
					id: 'valid-until',
					statement: 'Your credential declares an expiration date.',
					level: 'SHOULD',
					check: { kind: 'automatic', checkId: 'credential-valid-until' }
				}
			]
		}
	]
});
