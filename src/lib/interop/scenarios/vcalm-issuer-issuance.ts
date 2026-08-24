import { Scenario } from './scenario-schema.js';

/**
 * The VCALM **issuer** scenario — the operator's issuer drives a VC-API
 * exchange, the suite engages it as holder, and the credential that comes back
 * is measured on the wire and in the payload.
 *
 * Twelve requirements: the six the wire answers (the interaction URL resolved,
 * the participation endpoint answered, TLS, a `vcapi` entry, a DID-authentication
 * request, and that the delivered credential is bound to the DID we
 * authenticated), then the six shared `credential-*` payload rows the direct
 * scenario already proved.
 *
 * **Pure-automatic**, as `vcalm-verifier-delivery` is: the VCALM issuer flow is
 * entirely observable on the wire, and there is no "did your tool tell you
 * enough" question the operator could answer that the wire has not already
 * answered.
 *
 * `keyProofSuite` is authored explicitly rather than left to the default,
 * because the DIC producer scenarios differ from this one only in their
 * requirements — an explicit value makes the family legible side by side. It is
 * the suite's **own** holder key-proof suite; the credential's cryptosuite is
 * the operator's choice, and is what `di-proof` observes.
 *
 * Two engine rows are dropped: `participation-problemdetails` and
 * `didauth-problemdetails` were hardcoded `n/a`, needing a negative probe the
 * operator cannot observe and the suite does not run. `mapping.md` § 2 records it.
 */
export const vcalmIssuerIssuance = Scenario({
	slug: 'vcalm-issuer-issuance',
	name: 'Issue a credential to us over VCALM',
	blurb:
		'Create an issuance exchange on your issuer and give us the interaction URL. We take delivery as a holder would and check both the exchange and the credential.',
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'issue',
			title: 'Issue a credential to us over a VC-API exchange',
			summary:
				'Create an issuance exchange on your own issuer and paste its interaction URL below. We will fetch it, authenticate a DID, and take delivery of the credential. Each exchange is single-use, so a retry needs a fresh URL.',
			action: {
				kind: 'receive-from-issuer',
				transport: 'vcalm',
				keyProofSuite: 'eddsa-rdfc-2022'
			},
			requirements: [
				{
					id: 'interaction-url',
					statement: 'Your interaction URL resolved and returned VCALM interaction protocols.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-issuer-interaction-url' }
				},
				{
					id: 'participation-endpoint',
					statement: 'Your exchange-participation endpoint returned interaction protocols.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-issuer-participation-endpoint' }
				},
				{
					id: 'tls',
					statement: 'Your interaction endpoint used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-issuer-tls' }
				},
				{
					id: 'vcapi-in-protocols',
					statement: 'Your interaction protocols advertised a `vcapi` exchange endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-issuer-vcapi-in-protocols' }
				},
				{
					id: 'didauth-requested',
					statement: 'Your issuer asked us to authenticate a DID before issuing.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-issuer-didauth-requested' }
				},
				{
					id: 'binds-holder',
					statement: 'Your issuer bound the credential to the DID we authenticated with.',
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
