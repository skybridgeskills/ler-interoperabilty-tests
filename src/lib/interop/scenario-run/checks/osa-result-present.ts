import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { resultsOf } from './osa-shape.js';

/**
 * The credential carries at least one learner result. Ported 1:1 from
 * `open-skill-alignment.result.present`, minus the `includeAdditive` guard.
 */
export const osaResultPresent: AutomaticCheck = {
	id: 'osa-result-present',
	summary: 'The credential carries at least one `result` entry.',
	run: ({ stepId, evidence }) => {
		const results = resultsOf(artifactForStep(evidence, stepId));
		if (!results || results.length === 0) {
			return {
				met: false,
				detail: '`credentialSubject.result[]` must include at least one entry.'
			};
		}
		return {
			met: true,
			detail: `The credential carries ${results.length} result${results.length === 1 ? '' : 's'}.`
		};
	}
};
