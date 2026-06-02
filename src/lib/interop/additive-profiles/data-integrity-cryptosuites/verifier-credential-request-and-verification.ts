import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Verifier × Credential Request and Verification × VCALM — additive
 * layer for the data-integrity-cryptosuites bundle.
 *
 * Consumer-only: the verifier verifies the holder VP proof and the
 * issuer VC proofs embedded inside it. Both proofs MAY use either
 * cryptosuite in the bundle, so the verifier MUST support **every**
 * option.
 */
export const verifierCredentialRequestAndVerification = WorkflowChecklist({
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	profile: 'vcalm',
	steps: [
		{
			title: 'Consumer: verify VP + embedded VC proofs in any supported cryptosuite',
			summary:
				'After receiving the verifiablePresentation, verify the holder VP proof and every embedded VC proof. The verifier MUST support every cryptosuite in the bundle, so a single verification path covers all combinations issuers and wallets MAY produce.',
			requirements: [
				{
					id: 'data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.verify-vp-all',
					level: 'MUST',
					text: 'MUST verify holder VP proofs using **every** cryptosuite in the bundle (`eddsa-rdfc-2022` and `ecdsa-rdfc-2019`).'
				},
				{
					id: 'data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.verify-vc-all',
					level: 'MUST',
					text: 'MUST verify embedded VC proofs using **every** cryptosuite in the bundle (`eddsa-rdfc-2022` and `ecdsa-rdfc-2019`).'
				},
				{
					id: 'data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.resolve-issuer-dids',
					level: 'MUST',
					text: "MUST resolve issuer did:web and did:key identifiers to DID documents containing the verification method matching the VC proof's cryptosuite."
				},
				{
					id: 'data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.resolve-holder-dids',
					level: 'MUST',
					text: "MUST resolve holder did:web and did:key identifiers to DID documents containing the verification method matching the VP proof's cryptosuite."
				}
			]
		}
	]
});
