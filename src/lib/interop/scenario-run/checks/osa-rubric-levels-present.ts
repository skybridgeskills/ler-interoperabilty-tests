import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsOf, upstreamMissing } from './osa-shape.js';

/**
 * Every `RubricCriterionLevel` result description declares at least one level.
 * Ported from `open-skill-alignment.result-description.rubric-levels-present`.
 *
 * **Resolution (M11):** no rubric entries at all returned `n/a`; it resolves to
 * a **pass** — vacuously satisfied, exactly as `osa-percent-value-range` is.
 */
export const osaRubricLevelsPresent: AutomaticCheck = {
	id: 'osa-rubric-levels-present',
	summary: 'Every `RubricCriterionLevel` description declares at least one level.',
	run: ({ stepId, evidence }) => {
		const descriptions = descriptionsOf(artifactForStep(evidence, stepId));
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}
		const rubrics = descriptions.filter((d) => d?.resultType === 'RubricCriterionLevel');
		if (rubrics.length === 0) {
			return {
				met: true,
				detail: 'No `RubricCriterionLevel` result descriptions to check — nothing here to violate.'
			};
		}
		const empty = rubrics.filter(
			(d) => !Array.isArray(d?.rubricCriterionLevel) || d.rubricCriterionLevel.length === 0
		);
		if (empty.length > 0) {
			return {
				met: false,
				detail: `${empty.length} \`RubricCriterionLevel\` description${empty.length === 1 ? '' : 's'} declare no \`rubricCriterionLevel[]\` entries.`
			};
		}
		return {
			met: true,
			detail: 'Every `RubricCriterionLevel` description declares at least one level.'
		};
	}
};
