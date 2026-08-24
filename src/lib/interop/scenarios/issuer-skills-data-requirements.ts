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
		statement: 'You declared a performance scale on the achievement.',
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
		statement: 'Your percentage scales run from 0 to 100.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-percent-value-range' }
	},
	{
		id: 'rubric-levels-present',
		statement: 'Your rubric scales declare their levels.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'osa-rubric-levels-present' }
	},
	{
		id: 'ctdl-alignment',
		statement: 'Your result descriptions align to the CTDL Credential Registry.',
		level: 'SHOULD',
		check: { kind: 'automatic', checkId: 'osa-ctdl-alignment' }
	},
	{
		id: 'result-present',
		statement: 'You reported at least one learner result.',
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
