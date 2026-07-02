import { AdditiveProfile } from '../../additive-profile-schema.js';

import { issuerCredentialIssuance } from './issuer-credential-issuance.js';
import { issuerDirectCredentialIssuance } from './issuer-direct-credential-issuance.js';
import { dataIntegrityCryptosuitesMeta } from './profile.js';
import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';
import { walletCredentialAcceptance } from './wallet-credential-acceptance.js';
import { walletCredentialPresentation } from './wallet-credential-presentation.js';

/**
 * The data-integrity-cryptosuites additive profile, ready for use in
 * the UI and accessors. Layers two cryptosuite options (EdDSA + ECDSA)
 * on the `vcalm` and `oid4` base profiles across their 4 shared exchange
 * workflows, plus a producer-only layer on the `ob3-direct-delivery`
 * issuer direct-issuance operation. Additive checklists are matched to a
 * base profile by (role, workflow), so the 4 exchange checklists apply to
 * both vcalm and oid4 without duplication.
 */
export const dataIntegrityCryptosuites = AdditiveProfile({
	...dataIntegrityCryptosuitesMeta,
	checklists: [
		issuerCredentialIssuance,
		walletCredentialAcceptance,
		walletCredentialPresentation,
		verifierCredentialRequestAndVerification,
		issuerDirectCredentialIssuance
	]
});

export { dataIntegrityCryptosuitesMeta } from './profile.js';
