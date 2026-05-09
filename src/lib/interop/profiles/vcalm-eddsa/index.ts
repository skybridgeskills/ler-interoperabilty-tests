import { Profile } from '../../profile-schema.js';

import { issuerCredentialIssuance } from './issuer-credential-issuance.js';
import { vcalmEddsaProfileMeta } from './profile.js';
import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';
import { walletCredentialAcceptance } from './wallet-credential-acceptance.js';
import { walletCredentialPresentation } from './wallet-credential-presentation.js';

/** The VCALM-EdDSA profile, ready for use in the UI and accessors. */
export const vcalmEddsa = Profile({
	...vcalmEddsaProfileMeta,
	checklists: [
		issuerCredentialIssuance,
		walletCredentialAcceptance,
		verifierCredentialRequestAndVerification,
		walletCredentialPresentation
	]
});
