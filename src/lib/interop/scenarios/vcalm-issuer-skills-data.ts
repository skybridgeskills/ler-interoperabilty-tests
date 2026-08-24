import {
	issuerSkillsDataRequirements,
	SKILLS_DATA_PAYLOAD
} from './issuer-skills-data-requirements.js';
import { Scenario } from './scenario-schema.js';

/**
 * Open Skill Alignment over **VCALM** — one of the three members of the
 * `osa-issuer-payload` siblings. Identical to them apart from slug,
 * workflow, action and copy; see `ob3-direct-issuer-skills-data.ts` for why the
 * three are shaped this way, and why M15 dropped the `oneOf` group they used to form.
 */
export const vcalmIssuerSkillsData = Scenario({
	slug: 'vcalm-issuer-skills-data',
	name: 'Deliver skills data over VCALM',
	blurb:
		'Issue a credential carrying a performance scale and a learner result over a VC-API exchange. It counts toward this protocol’s Open Skill Alignment add-on badge.',
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'vcalm', level: 'additive-only' },
		{ profile: 'open-skill-alignment', level: 'required' }
	],
	steps: [
		{
			id: 'issue',
			title: 'Issue a credential carrying skills data over a VC-API exchange',
			summary: `${SKILLS_DATA_PAYLOAD} Then create an issuance exchange for it and paste the interaction URL below. Each exchange is single-use, so a retry needs a fresh URL.`,
			action: {
				kind: 'receive-from-issuer',
				transport: 'vcalm',
				keyProofSuite: 'eddsa-rdfc-2022'
			},
			requirements: issuerSkillsDataRequirements
		}
	]
});
