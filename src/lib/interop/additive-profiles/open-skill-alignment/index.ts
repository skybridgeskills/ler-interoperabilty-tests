import { AdditiveProfile } from '../../additive-profile-schema.js';

import { openSkillAlignmentMeta } from './profile.js';

/** The Open Skill Alignment additive profile, ready for use in the UI + accessors. */
export const openSkillAlignment = AdditiveProfile({ ...openSkillAlignmentMeta });

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
