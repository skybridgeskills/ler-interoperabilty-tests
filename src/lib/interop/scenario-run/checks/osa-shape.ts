import { credentialOf, subjectOf } from './credential-shape.js';

/**
 * Readers for the Open Skill Alignment payload — the performance scale on the
 * achievement (`resultDescription[]`) and the learner's results (`result[]`).
 *
 * Ported from `issuer-runner/checks/open-skill-alignment-issuer.ts`. Like the
 * `credential-*` family, every OSA check reads the received credential from
 * `StepEvidence.artifact`, which is what lets one set of checks serve all three
 * transports and makes the `osa-issuer-payload` `oneOf` group expressible.
 */

export type ResultDescriptionShape = {
	id?: unknown;
	resultType?: unknown;
	valueMin?: unknown;
	valueMax?: unknown;
	rubricCriterionLevel?: unknown[];
	alignment?: unknown[];
};

export type ResultShape = {
	resultDescription?: unknown;
	value?: unknown;
	achievedLevel?: unknown;
	alignment?: unknown[];
};

/** `credentialSubject.achievement.resultDescription[]`, or `undefined` when there is none. */
export function descriptionsOf(artifact: unknown): ResultDescriptionShape[] | undefined {
	const credential = credentialOf(artifact);
	if (!credential) return undefined;
	const achievement = subjectOf(credential)?.achievement as
		| { resultDescription?: unknown }
		| undefined;
	const rd = achievement?.resultDescription;
	return Array.isArray(rd) ? (rd as ResultDescriptionShape[]) : undefined;
}

/** `credentialSubject.result[]`, or `undefined` when there is none. */
export function resultsOf(artifact: unknown): ResultShape[] | undefined {
	const credential = credentialOf(artifact);
	if (!credential) return undefined;
	const rs = subjectOf(credential)?.result;
	return Array.isArray(rs) ? (rs as ResultShape[]) : undefined;
}

/** Index the declared result descriptions by id, for the checks that cross-reference. */
export function descriptionsById(
	descriptions: ResultDescriptionShape[]
): Map<string, ResultDescriptionShape> {
	return new Map(
		descriptions
			.filter((d): d is ResultDescriptionShape => !!d && typeof d.id === 'string')
			.map((d) => [d.id as string, d])
	);
}

/**
 * The detail an OSA check gives when the upstream `.present` requirement has
 * already failed.
 *
 * **Resolution (M11):** the engine returned a passthrough `n/a` here. The
 * automatic model has neither `n/a` nor `warn`, and this resolves to a **fail** —
 * the scenario has already failed on the upstream MUST, and a green row beside a
 * red one would read as though something had been verified when nothing was.
 */
export function upstreamMissing(field: 'resultDescription' | 'result'): string {
	return `There were no \`${field}\` entries to evaluate — see the "${field} present" requirement above.`;
}
