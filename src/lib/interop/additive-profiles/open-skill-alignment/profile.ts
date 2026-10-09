import type { ProfileSlug } from '../../profile-schema.js';
import type { StandardCitation } from '../../standards.js';

/** Identity + composition info for the Open Skill Alignment additive profile. */
export const openSkillAlignmentMeta = {
	id: 'open-skill-alignment-v1',
	slug: 'open-skill-alignment' as const,
	name: 'Open Skill Alignment',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-05-15',
	standards: [{ standard: 'ob-3' }] satisfies StandardCitation[],
	example: {
		builder: 'e.g. your issuer adds scores or rubric levels aligned to skills',
		evaluator: 'e.g. you need credentials that carry skills data employers can read'
	},
	description:
		'Adds machine-readable skill-alignment data to an OpenBadgeCredential ' +
		'using credentialSubject.result[] and credentialSubject.achievement.resultDescription[]. ' +
		'Alignment target URLs SHOULD point at CTDL resources in the Credential Registry. Supported ' +
		'resultType values: RawScore, Percent, RubricCriterionLevel.',
	appliesToBaseProfiles: ['ob3-direct-delivery', 'vcalm', 'oid4'] satisfies ProfileSlug[]
};
