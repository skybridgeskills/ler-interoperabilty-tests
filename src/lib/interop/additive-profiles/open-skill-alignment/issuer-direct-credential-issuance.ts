import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Direct Credential Issuance × Open Skill Alignment.
 *
 * Layered on top of the base OB 3.0 Direct Delivery issuer checklist;
 * adds structural requirements for `credentialSubject.result[]` +
 * `credentialSubject.achievement.resultDescription[]` plus CTDL
 * alignment URLs.
 *
 * Each requirement carries a stable `id` keyed off
 * `open-skill-alignment.<topic>.<assertion>`. Phase 03 maps these ids
 * to check functions in the issuer-runner check registry.
 */
export const issuerDirectCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	profile: 'ob3-direct-delivery',
	steps: [
		{
			title: 'Declare the performance scale on the achievement',
			summary:
				'Populate `credentialSubject.achievement.resultDescription[]` with one or more performance scales. Each description declares a recognized `resultType`, scale bounds (numeric) or levels (rubric), and skill-alignment metadata.',
			requirements: [
				{
					id: 'open-skill-alignment.result-description.present',
					level: 'MUST',
					text: '`credentialSubject.achievement.resultDescription[]` MUST include at least one entry.'
				},
				{
					id: 'open-skill-alignment.result-description.recognized-result-type',
					level: 'MUST',
					text: 'Every `resultDescription.resultType` MUST be one of: `RawScore`, `Percent`, `RubricCriterionLevel`.'
				},
				{
					id: 'open-skill-alignment.result-description.percent-value-range',
					level: 'MUST',
					text: 'Every `Percent` resultDescription MUST set `valueMin: "0"` and `valueMax: "100"`.'
				},
				{
					id: 'open-skill-alignment.result-description.rubric-levels-present',
					level: 'MUST',
					text: 'Every `RubricCriterionLevel` resultDescription MUST include a non-empty `rubricCriterionLevel[]` array.'
				},
				{
					id: 'open-skill-alignment.result-description.ctdl-alignment',
					level: 'SHOULD',
					text: 'Every `resultDescription.alignment[].targetUrl` SHOULD point at a CTDL resource in the Credential Registry. Other registries are accepted with a warning.'
				}
			]
		},
		{
			title: 'Assert the learner result against the declared scale',
			summary:
				'Populate `credentialSubject.result[]` with at least one entry that links to a declared `resultDescription` and carries the learner performance value or achieved rubric level.',
			requirements: [
				{
					id: 'open-skill-alignment.result.present',
					level: 'MUST',
					text: '`credentialSubject.result[]` MUST include at least one entry.'
				},
				{
					id: 'open-skill-alignment.result.links-description',
					level: 'MUST',
					text: 'Every `result.resultDescription` MUST match the `id` of one of the declared `resultDescription[]` entries.'
				},
				{
					id: 'open-skill-alignment.result.numeric-value-in-range',
					level: 'MUST',
					text: 'For results linked to a `RawScore` or `Percent` description, `value` MUST be a non-empty string parseable as a number within `[valueMin, valueMax]` when those bounds are declared.'
				},
				{
					id: 'open-skill-alignment.result.achieved-level-matches',
					level: 'MUST',
					text: "For results linked to a `RubricCriterionLevel` description, `achievedLevel` MUST match one of the description's `rubricCriterionLevel[].id` entries."
				},
				{
					id: 'open-skill-alignment.result.alignment-optional',
					level: 'MAY',
					text: 'A `result[]` entry MAY carry an additional `alignment[]` with CTDL URLs that augments the description-level alignments.'
				}
			]
		}
	]
});
