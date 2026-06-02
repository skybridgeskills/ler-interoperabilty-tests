import { AdditiveProfile } from '../../additive-profile-schema.js';

import { issuerCredentialIssuance } from './issuer-credential-issuance.js';
import { dataIntegrityCryptosuitesMeta } from './profile.js';
import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';
import { walletCredentialAcceptance } from './wallet-credential-acceptance.js';
import { walletCredentialPresentation } from './wallet-credential-presentation.js';

/**
 * The data-integrity-cryptosuites additive profile, ready for use in
 * the UI and accessors. Layers two cryptosuite options (EdDSA + ECDSA)
 * on top of the vcalm base profile across all 4 vcalm workflows.
 */
export const dataIntegrityCryptosuites = AdditiveProfile({
	...dataIntegrityCryptosuitesMeta,
	checklists: [
		issuerCredentialIssuance,
		walletCredentialAcceptance,
		walletCredentialPresentation,
		verifierCredentialRequestAndVerification
	]
});

export { dataIntegrityCryptosuitesMeta } from './profile.js';
