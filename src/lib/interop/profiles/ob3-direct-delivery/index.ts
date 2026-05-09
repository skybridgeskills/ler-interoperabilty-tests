import { Profile } from '../../profile-schema.js';

import { issuerDirectCredentialIssuance } from './issuer-direct-credential-issuance.js';
import { ob3DirectDeliveryProfileMeta } from './profile.js';
import { verifierDirectCredentialVerification } from './verifier-direct-credential-verification.js';

/** The OB 3.0 Direct Delivery profile, ready for use in the UI and accessors. */
export const ob3DirectDelivery = Profile({
	...ob3DirectDeliveryProfileMeta,
	checklists: [issuerDirectCredentialIssuance, verifierDirectCredentialVerification]
});
