import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsOf, upstreamMissing } from './osa-shape.js';

/** The result types Open Skill Alignment recognises. */
const RECOGNIZED = new Set(['RawScore', 'Percent', 'RubricCriterionLevel']);

/**
 * Every declared result description uses a supported `resultType`. Ported 1:1
 * from `open-skill-alignment.result-description.recognized-result-type`.
 */
export const osaRecognizedResultType: AutomaticCheck = {
	id: 'osa-recognized-result-type',
	summary: 'Every `resultDescription` uses a supported `resultType`.',
	run: ({ stepId, evidence }) => {
		const descriptions = descriptionsOf(artifactForStep(evidence, stepId));
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}
		const unknown = [
			...new Set(
				descriptions
					.map((d) => d?.resultType)
					.filter((t): t is string => typeof t === 'string' && !RECOGNIZED.has(t))
			)
		];
		if (unknown.length > 0) {
			return {
				met: false,
				detail: `Unrecognised \`resultType\`: ${unknown.join(', ')}. Supported types are RawScore, Percent and RubricCriterionLevel.`
			};
		}
		return { met: true, detail: 'Every result description uses a supported `resultType`.' };
	}
};
