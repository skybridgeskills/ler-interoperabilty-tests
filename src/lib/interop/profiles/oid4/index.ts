import { Profile } from '../../profile-schema.js';

import { issuerCredentialIssuance } from './issuer-credential-issuance.js';
import { oid4ProfileMeta } from './profile.js';
import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';
import { walletCredentialAcceptance } from './wallet-credential-acceptance.js';
import { walletCredentialPresentation } from './wallet-credential-presentation.js';

/** The OID4 profile, ready for use in the UI and accessors. */
export const oid4 = Profile({
	...oid4ProfileMeta,
	checklists: [
		issuerCredentialIssuance,
		walletCredentialAcceptance,
		verifierCredentialRequestAndVerification,
		walletCredentialPresentation
	]
});
