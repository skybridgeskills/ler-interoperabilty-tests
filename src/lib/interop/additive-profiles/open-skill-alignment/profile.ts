import type { ProfileSlug } from '../../profile-schema.js';

/** Identity + composition info for the Open Skill Alignment additive profile. */
export const openSkillAlignmentMeta = {
	id: 'open-skill-alignment-v1',
	slug: 'open-skill-alignment' as const,
	name: 'Open Skill Alignment',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-05-15',
	description:
		'Additive profile that adds machine-readable skill-alignment data to an OpenBadgeCredential ' +
		'using credentialSubject.result[] and credentialSubject.achievement.resultDescription[]. ' +
		'Alignment target URLs SHOULD point at CTDL resources in the Credential Registry. Supported ' +
		'resultType values: RawScore, Percent, RubricCriterionLevel.',
	appliesToBaseProfiles: ['ob3-direct-delivery', 'vcalm', 'oid4'] satisfies ProfileSlug[]
};
