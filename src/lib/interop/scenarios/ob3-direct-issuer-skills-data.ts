import {
	issuerSkillsDataRequirements,
	SKILLS_DATA_PAYLOAD
} from './issuer-skills-data-requirements.js';
import { Scenario } from './scenario-schema.js';

/**
 * Open Skill Alignment over the **direct paste** transport — one of the three
 * members of the `osa-issuer-payload` group.
 *
 * The additive's question is about the *payload*, not the protocol: the same
 * item completes whether the credential arrived over VCALM, over OID4VCI, or as
 * a paste. That is what `{ oneOf }` expresses here, and why all three members
 * declare identical requirement ids.
 *
 * `ob3-direct-delivery: additive-only` — the base profile names this scenario
 * because direct delivery is the protocol it runs over, and claims **none** of
 * it. An additive scenario must never enlarge its base profile's meters or make
 * either of its badges harder to earn: the base badge gets a companion, not a
 * bigger denominator. `optional` would not do that job — under the two-tier
 * model it is the profile's **Expanded** set and counts toward Complete, so a
 * "complete OB 3.0 issuer" would silently come to mean "…and does skill
 * alignment too".
 */
export const ob3DirectIssuerSkillsData = Scenario({
	slug: 'ob3-direct-issuer-skills-data',
	name: 'Deliver skills data in a credential you issue',
	blurb:
		'Issue a credential carrying a performance scale and a learner result, and paste it here. Passing this over any one protocol completes the skills-data item.',
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	memberships: [
		{ profile: 'ob3-direct-delivery', level: 'additive-only' },
		{ profile: 'open-skill-alignment', level: { oneOf: 'osa-issuer-payload' } }
	],
	steps: [
		{
			id: 'deliver',
			title: 'Issue a credential carrying skills data and paste it here',
			summary: `${SKILLS_DATA_PAYLOAD} Then download or copy it and paste the credential JSON below.`,
			action: { kind: 'receive-from-issuer', transport: 'direct' },
			requirements: issuerSkillsDataRequirements
		}
	]
});
