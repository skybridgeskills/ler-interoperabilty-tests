import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Wallet × Credential Presentation — additive layer for the
 * data-integrity-cryptosuites bundle (applies to the vcalm + oid4 exchange
 * profiles by role+workflow).
 *
 * Producer-only: the wallet signs the VP it sends to the verifier.
 * Embedded VCs keep whatever cryptosuite their issuers chose — the
 * wallet preserves those proofs verbatim, it does not re-sign the VC.
 */
export const walletCredentialPresentation = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-presentation',
	profile: 'vcalm',
	steps: [
		{
			title: 'Producer: sign the verifiable presentation',
			summary:
				"Sign the verifiablePresentation with one of the bundle's cryptosuite options. The credential-subject DID must carry a verification method whose key type matches the chosen cryptosuite. Embedded VC proofs MUST be preserved verbatim, regardless of which cryptosuite they use.",
			requirements: [
				{
					id: 'data-integrity-cryptosuites.wallet.credential-presentation.producer.vp-cryptosuite-supported',
					level: 'MUST',
					text: "MUST sign each VP using at least one of the bundle's cryptosuites: `eddsa-rdfc-2022` (Ed25519) or `ecdsa-rdfc-2019` (P-256)."
				},
				{
					id: 'data-integrity-cryptosuites.wallet.credential-presentation.producer.holder-did-method',
					level: 'MUST',
					text: 'MUST use a did:web or did:key credential-subject identifier.'
				},
				{
					id: 'data-integrity-cryptosuites.wallet.credential-presentation.producer.key-type-matches',
					level: 'MUST',
					text: 'MUST manage at least one key pair whose key type matches the chosen cryptosuite (Ed25519 for `eddsa-rdfc-2022`; P-256 for `ecdsa-rdfc-2019`) and publish it as a verification method in the credential-subject DID document.'
				},
				{
					id: 'data-integrity-cryptosuites.wallet.credential-presentation.producer.preserve-vc-proofs',
					level: 'MUST',
					text: 'MUST preserve the original VC proofs verbatim when embedding VCs in the VP, regardless of which cryptosuite the issuer used.'
				}
			]
		}
	]
});
