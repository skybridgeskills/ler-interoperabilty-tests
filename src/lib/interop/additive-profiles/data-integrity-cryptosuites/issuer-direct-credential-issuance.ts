import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Direct Credential Issuance — additive layer for the
 * data-integrity-cryptosuites bundle on the OB3 Direct Delivery profile.
 *
 * Direct delivery has no exchange and no holder DID-auth presentation,
 * so this is producer-only: the issued static credential MUST be signed
 * with one of the bundle's cryptosuite options. (The base OB3 Direct
 * Delivery profile additionally requires eddsa-rdfc-2022 specifically;
 * this additive is the broader either-suite layer.)
 *
 * `profile` is set to 'ob3-direct-delivery' for documentation only —
 * additive checklists are matched to base profiles by (role, workflow),
 * not by this field.
 */
export const issuerDirectCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	profile: 'ob3-direct-delivery',
	steps: [
		{
			title: 'Producer: sign the credential with a supported cryptosuite',
			summary:
				"Sign every issued OpenBadgeCredential with one of the bundle's cryptosuite options. The issuer DID must carry a verification method whose key type matches the chosen cryptosuite.",
			requirements: [
				{
					id: 'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.cryptosuite-supported',
					level: 'MUST',
					text: "MUST sign the issued VC with a DataIntegrityProof using one of the bundle's cryptosuites: `eddsa-rdfc-2022` (Ed25519) or `ecdsa-rdfc-2019` (P-256)."
				},
				{
					id: 'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.did-method',
					level: 'MUST',
					text: 'MUST use a did:web or did:key issuer identifier.'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.key-type-matches',
					level: 'MUST',
					text: 'MUST reference a verification method whose key type matches the chosen cryptosuite (Ed25519 for `eddsa-rdfc-2022`; P-256 for `ecdsa-rdfc-2019`).'
				}
			]
		}
	]
});
