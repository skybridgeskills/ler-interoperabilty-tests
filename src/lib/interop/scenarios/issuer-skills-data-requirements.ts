import type { PerspectiveCopy } from '$lib/interop/perspective/perspective.js';

import { cite } from './citations.js';
import type { Requirement } from './requirement-schema.js';

/**
 * The nine Open Skill Alignment payload requirements, shared verbatim by the
 * three `*-issuer-skills-data` scenarios.
 *
 * **The ids are identical across all three**, by construction rather than by
 * rule. Until M15 catalog rule 5 enforced it, because the three formed an
 * `osa-issuer-payload` `oneOf` group; M15 dropped the group, so nothing validates
 * the parity any more and this shared module *is* the guarantee. A reader
 * comparing an OID4 result with a VCALM one must be comparing like with like —
 * declaring the nine once here is what keeps the three from drifting apart.
 *
 * The nine are the survivors of `mapping.md` § 5. `result.alignment-optional` is
 * dropped — a `MAY`, and `RequirementLevel` is `MUST | SHOULD` only.
 */
export const issuerSkillsDataRequirements: Requirement[] = [
	{
		id: 'result-description-present',
		statement: 'The achievement declares a performance scale.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-result-description-present' }
	},
	{
		id: 'recognized-result-type',
		statement: 'Every result description uses a supported result type.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-recognized-result-type' }
	},
	{
		id: 'percent-value-range',
		statement: 'Every percentage scale runs from 0 to 100.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-percent-value-range' }
	},
	{
		id: 'rubric-levels-present',
		statement: 'Every rubric scale declares its levels.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-rubric-levels-present' }
	},
	{
		id: 'ctdl-alignment',
		statement: 'The result descriptions align to the CTDL Credential Registry.',
		level: 'SHOULD',
		check: { kind: 'automatic', checkId: 'osa-ctdl-alignment' }
	},
	{
		id: 'result-present',
		statement: 'The credential reports at least one learner result.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-result-present' }
	},
	{
		id: 'result-links-description',
		statement: 'Every result names a scale the achievement declares.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-result-links-description' }
	},
	{
		id: 'numeric-value-in-range',
		statement: 'Every numeric result falls inside its declared range.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-numeric-value-in-range' }
	},
	{
		id: 'achieved-level-matches',
		statement: 'Every rubric result names a level the scale declares.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-achieved-level-matches' }
	}
];

/**
 * What the operator has to do, whatever the transport: issue a credential that
 * carries a performance scale and a learner result.
 *
 * The Open Skill Alignment fixtures under
 * `additive-profiles/open-skill-alignment/fixtures/` are the right shape, and
 * they are described in prose rather than offered as a loadable sample —
 * scoring our own fixture would record a pass for a credential the operator's
 * issuer never produced.
 */
export const SKILLS_DATA_PAYLOAD =
	'Issue a credential whose achievement carries a performance scale (`credentialSubject.achievement.resultDescription[]` — a raw score, a percentage or a rubric) and whose subject carries the learner’s result (`credentialSubject.result[]`).';

/** What every issuer skills-data scenario tests against: OB 3.0's result model and its CTDL alignment. */
export const skillsDataCitations = [
	cite.obResultDescription,
	cite.obResult,
	cite.obCredentialEngineAlignment
];

/** The transports the three skills-data siblings run over. */
type SkillsDataTransport = 'direct' | 'vcalm' | 'oid4vci';

const SKILLS_DATA_TRANSPORT: Record<
	SkillsDataTransport,
	{ issues: string; handOver: string; profile: string }
> = {
	direct: {
		issues: 'the credentials it hands over directly',
		handOver: 'and hand it over as a file or text',
		profile: 'OB 3.0 Direct Delivery'
	},
	vcalm: {
		issues: 'the credentials it issues over VCALM',
		handOver: 'over a VC-API exchange',
		profile: 'VCALM'
	},
	oid4vci: {
		issues: 'the credentials it issues over OID4VCI',
		handOver: 'over OID4VCI',
		profile: 'OID4'
	}
};

/**
 * The framing paragraphs the three siblings share: the payload question is the
 * same whatever the transport, so only the transport phrase and the base
 * Standard Profile's name differ between them.
 */
export function skillsDataFramingFor(transport: SkillsDataTransport): PerspectiveCopy {
	const { issues, handOver, profile } = SKILLS_DATA_TRANSPORT[transport];
	return {
		builder: `You’re testing whether your own issuer puts skills data into ${issues}: have a build that can issue a credential whose achievement declares a performance scale (a raw score, a percentage or a rubric) and whose subject carries a learner result against it. We check that every result fits the scale it names, so a failure usually means a result pointing at a scale the achievement doesn’t declare, or a value outside its range. This run counts toward the Open Skill Alignment Add-on for ${profile}, not toward the Standard Profile itself.`,
		evaluator: `You’re checking whether a vendor’s issuer can say what a learner achieved, not just that they earned a badge. Ask the vendor to issue a credential with a real performance scale and a result against it ${handOver}, ideally from an actual program rather than a demo. A pass means the scale and result are well-formed and agree with each other; it doesn’t say whether the scale is meaningful, so judge that part yourself.`
	};
}
