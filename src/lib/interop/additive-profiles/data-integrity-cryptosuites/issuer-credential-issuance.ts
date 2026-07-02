import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Credential Issuance — additive layer for the
 * data-integrity-cryptosuites bundle (applies to the vcalm + oid4 exchange
 * profiles by role+workflow).
 *
 * Split into two steps. The "Producer" step covers the issuer's
 * VC-signing obligations (pick ≥1 option). The "Consumer" step covers
 * the DID-auth VP-verification the issuer service performs to bind
 * `credentialSubject.id` — that's a consumer-of-proofs role, so MUST
 * cover *every* option in the bundle.
 */
export const issuerCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'vcalm',
	steps: [
		{
			title: 'Producer: sign the credential with a supported cryptosuite',
			summary:
				"Pick at least one of the bundle's cryptosuite options and sign every issued OpenBadgeCredential with it. The issuer DID must carry a verification method whose key type matches the chosen cryptosuite.",
			requirements: [
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.cryptosuite-supported',
					level: 'MUST',
					text: "MUST sign each issued VC using at least one of the bundle's cryptosuites: `eddsa-rdfc-2022` (Ed25519) or `ecdsa-rdfc-2019` (P-256)."
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.did-method',
					level: 'MUST',
					text: 'MUST use a did:web or did:key issuer identifier.'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.key-type-matches',
					level: 'MUST',
					text: 'MUST include in the issuer DID document a verification method whose key type matches the chosen cryptosuite (Ed25519 for `eddsa-rdfc-2022`; P-256 for `ecdsa-rdfc-2019`).'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.proof-purpose',
					level: 'MUST',
					text: 'MUST set the proof `proofPurpose` to `assertionMethod` and reference a verification method id resolvable in the issuer DID document.'
				}
			]
		},
		{
			title: 'Consumer: verify the DID-auth presentation in any supported cryptosuite',
			summary:
				"When the wallet posts a DID-auth verifiablePresentation, the issuer service verifies its proof to bind credentialSubject.id. The issuer MUST be able to verify presentations using any of the bundle's cryptosuite options.",
			requirements: [
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.consumer.verify-vp-all',
					level: 'MUST',
					text: 'MUST verify holder VP proofs using **every** cryptosuite in the bundle (`eddsa-rdfc-2022` and `ecdsa-rdfc-2019`).'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.consumer.resolve-holder-dids',
					level: 'MUST',
					text: "MUST resolve holder did:web and did:key identifiers to DID documents containing the verification method matching the VP proof's cryptosuite."
				}
			]
		}
	]
});
