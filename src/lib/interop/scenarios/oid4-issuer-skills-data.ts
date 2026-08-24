import {
	issuerSkillsDataRequirements,
	SKILLS_DATA_PAYLOAD
} from './issuer-skills-data-requirements.js';
import { Scenario } from './scenario-schema.js';

/**
 * Open Skill Alignment over **OID4VCI** — one of the three members of the
 * `osa-issuer-payload` siblings. Identical to them apart from slug,
 * workflow, action and copy; see `ob3-direct-issuer-skills-data.ts` for why the
 * three are shaped this way, and why M15 dropped the `oneOf` group they used to form.
 */
export const oid4IssuerSkillsData = Scenario({
	slug: 'oid4-issuer-skills-data',
	name: 'Deliver skills data over OID4VCI',
	blurb:
		'Issue a credential carrying a performance scale and a learner result over OID4VCI. It counts toward this protocol’s Open Skill Alignment add-on badge.',
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'oid4', level: 'additive-only' },
		{ profile: 'open-skill-alignment', level: 'required' }
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
