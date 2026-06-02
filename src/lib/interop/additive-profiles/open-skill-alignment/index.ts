import { AdditiveProfile } from '../../additive-profile-schema.js';

import { issuerDirectCredentialIssuance } from './issuer-direct-credential-issuance.js';
import { openSkillAlignmentMeta } from './profile.js';
import { verifierDirectCredentialVerification } from './verifier-direct-credential-verification.js';

/** The Open Skill Alignment additive profile, ready for use in the UI + accessors. */
export const openSkillAlignment = AdditiveProfile({
	...openSkillAlignmentMeta,
	checklists: [issuerDirectCredentialIssuance, verifierDirectCredentialVerification]
});

export { openSkillAlignmentMeta } from './profile.js';
export { OpenSkillAlignmentFragment } from './payload-fragment-schema.js';
export type { OpenSkillAlignmentFragment as OpenSkillAlignmentFragmentType } from './payload-fragment-schema.js';
export {
	rawScoreFixture,
	percentFixture,
	rubricCriterionLevelFixture,
	sampleCredentialsByResultType,
	sampleResultTypes,
	type SampleResultType
} from './fixtures/index.js';
