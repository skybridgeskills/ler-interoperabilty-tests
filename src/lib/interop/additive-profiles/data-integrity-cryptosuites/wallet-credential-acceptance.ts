import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Wallet × Credential Acceptance — additive layer for the
 * data-integrity-cryptosuites bundle (applies to the vcalm + oid4 exchange
 * profiles by role+workflow). For OID4 the producer VP is the di_vp key proof;
 * for VCALM it is the DIDAuthentication VP.
 *
 * Producer step: the wallet signs the DID-auth VP it posts back (≥1
 * option). Consumer step: the wallet verifies the issuer-signed VC it
 * receives, which means supporting every cryptosuite in the bundle.
 */
export const walletCredentialAcceptance = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-acceptance',
	profile: 'vcalm',
	steps: [
		{
			title: 'Producer: sign the DID-auth presentation',
			summary:
				"Sign the DIDAuthentication verifiablePresentation with one of the bundle's cryptosuite options. The credential-subject DID must carry a verification method whose key type matches the chosen cryptosuite.",
			requirements: [
				{
					id: 'data-integrity-cryptosuites.wallet.credential-acceptance.producer.vp-cryptosuite-supported',
					level: 'MUST',
					text: "MUST sign the DID-auth VP using at least one of the bundle's cryptosuites: `eddsa-rdfc-2022` (Ed25519) or `ecdsa-rdfc-2019` (P-256)."
				},
				{
					id: 'data-integrity-cryptosuites.wallet.credential-acceptance.producer.holder-did-method',
					level: 'MUST',
					text: 'MUST use a did:web or did:key credential-subject identifier.'
				},
				{
					id: 'data-integrity-cryptosuites.wallet.credential-acceptance.producer.key-type-matches',
					level: 'MUST',
					text: 'MUST manage at least one key pair whose key type matches the chosen cryptosuite (Ed25519 for `eddsa-rdfc-2022`; P-256 for `ecdsa-rdfc-2019`) and publish it as a verification method in the credential-subject DID document.'
				}
			]
		},
		{
			title: 'Consumer: verify the issued credential in any supported cryptosuite',
			summary:
				'After receiving the issued credential, the wallet verifies its Data Integrity proof. The wallet MUST be able to verify VCs signed with any cryptosuite in the bundle, regardless of which option(s) it produces with.',
			requirements: [
				{
					id: 'data-integrity-cryptosuites.wallet.credential-acceptance.consumer.verify-vc-all',
					level: 'MUST',
					text: 'MUST verify issued credential proofs using **every** cryptosuite in the bundle (`eddsa-rdfc-2022` and `ecdsa-rdfc-2019`).'
				},
				{
					id: 'data-integrity-cryptosuites.wallet.credential-acceptance.consumer.resolve-issuer-dids',
					level: 'MUST',
					text: "MUST resolve issuer did:web and did:key identifiers to DID documents containing the verification method matching the credential proof's cryptosuite."
				}
			]
		}
	]
});
