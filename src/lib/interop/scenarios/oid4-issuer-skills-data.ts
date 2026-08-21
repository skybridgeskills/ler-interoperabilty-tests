import {
	issuerSkillsDataRequirements,
	SKILLS_DATA_PAYLOAD
} from './issuer-skills-data-requirements.js';
import { Scenario } from './scenario-schema.js';

/**
 * Open Skill Alignment over **OID4VCI** — one of the three members of the
 * `osa-issuer-payload` group. Identical to its siblings apart from slug,
 * workflow, action and copy; see `ob3-direct-issuer-skills-data.ts` for why the
 * group is shaped this way.
 */
export const oid4IssuerSkillsData = Scenario({
	slug: 'oid4-issuer-skills-data',
	name: 'Deliver skills data over OID4VCI',
	blurb:
		'Issue a credential carrying a performance scale and a learner result over OID4VCI. Passing this over any one protocol completes the skills-data item.',
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'oid4', level: 'additive-only' },
		{ profile: 'open-skill-alignment', level: { oneOf: 'osa-issuer-payload' } }
	],
	steps: [
		{
			id: 'issue',
			title: 'Issue a credential carrying skills data over OID4VCI',
			summary: `${SKILLS_DATA_PAYLOAD} Then publish a pre-authorized-code credential offer for it and paste the \`openid-credential-offer://\` URL below.`,
			action: {
				kind: 'receive-from-issuer',
				transport: 'oid4vci',
				keyProofSuite: 'eddsa-rdfc-2022'
			},
			requirements: issuerSkillsDataRequirements
		}
	]
});
