import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsById, descriptionsOf, resultsOf, upstreamMissing } from './osa-shape.js';

/**
 * Every rubric result names a level its description declares. Ported from
 * `open-skill-alignment.result.achieved-level-matches`.
 *
 * **Resolution (M11):** no rubric results returned `n/a`; it resolves to a
 * **pass** — vacuously satisfied, as the two sibling range checks are.
 */
export const osaAchievedLevelMatches: AutomaticCheck = {
	id: 'osa-achieved-level-matches',
	summary: 'Every rubric result names a declared `rubricCriterionLevel`.',
	run: ({ stepId, evidence }) => {
		const artifact = artifactForStep(evidence, stepId);
		const results = resultsOf(artifact);
		if (!results || results.length === 0) return { met: false, detail: upstreamMissing('result') };
		const descriptions = descriptionsOf(artifact);
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}

		const byId = descriptionsById(descriptions);
		const rubric = results.filter(
			(r) => byId.get(r?.resultDescription as string)?.resultType === 'RubricCriterionLevel'
		);
		if (rubric.length === 0) {
			return {
				met: true,
				detail: 'No rubric results to level-check — nothing here to violate.'
			};
		}

		const failures: string[] = [];
		for (const result of rubric) {
			const description = byId.get(result?.resultDescription as string)!;
			const levels = Array.isArray(description.rubricCriterionLevel)
				? description.rubricCriterionLevel
				: [];
			const declared = new Set(
				levels
					.map((level) => (level as { id?: unknown })?.id)
					.filter((id): id is string => typeof id === 'string')
			);
			const achieved = result?.achievedLevel;
			if (typeof achieved !== 'string' || achieved.length === 0) {
				failures.push(`${String(description.id)}: \`achievedLevel\` is missing.`);
				continue;
			}
			if (!declared.has(achieved)) {
				failures.push(
					`${String(description.id)}: \`achievedLevel\` "${achieved}" matches no declared \`rubricCriterionLevel.id\`.`
				);
			}
		}
		if (failures.length > 0) return { met: false, detail: failures.join(' ') };
		return {
			met: true,
			detail: `${rubric.length} rubric result${rubric.length === 1 ? '' : 's'} match a declared level.`
		};
	}
};
