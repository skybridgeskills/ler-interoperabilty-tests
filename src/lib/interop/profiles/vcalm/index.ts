import { Profile } from '../../profile-schema.js';

import { issuerCredentialIssuance } from './issuer-credential-issuance.js';
import { vcalmProfileMeta } from './profile.js';
import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';
import { walletCredentialAcceptance } from './wallet-credential-acceptance.js';
import { walletCredentialPresentation } from './wallet-credential-presentation.js';

/** The VCALM profile, ready for use in the UI and accessors. */
export const vcalm = Profile({
	...vcalmProfileMeta,
	checklists: [
		issuerCredentialIssuance,
		walletCredentialAcceptance,
		verifierCredentialRequestAndVerification,
		walletCredentialPresentation
	]
});
