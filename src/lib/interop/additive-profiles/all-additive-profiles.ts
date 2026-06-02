import type { AdditiveProfile } from '../additive-profile-schema.js';

import { dataIntegrityCryptosuites } from './data-integrity-cryptosuites/index.js';
import { openSkillAlignment } from './open-skill-alignment/index.js';

/**
 * Canonical ordered list of additive profiles. Order is the navigation
 * order shown on `/profiles`.
 */
export const allAdditiveProfiles: AdditiveProfile[] = [
	openSkillAlignment,
	dataIntegrityCryptosuites
];
