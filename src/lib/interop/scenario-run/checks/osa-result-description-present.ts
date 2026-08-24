import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsOf } from './osa-shape.js';

/**
 * The achievement declares a performance scale. Ported 1:1 from
 * `open-skill-alignment.result-description.present`, minus the
 * `includeAdditive` guard — under memberships a scenario either names the
 * additive or does not, so the flag has nothing left to decide.
 */
export const osaResultDescriptionPresent: AutomaticCheck = {
	id: 'osa-result-description-present',
	summary: 'The achievement declares at least one `resultDescription`.',
	run: ({ stepId, evidence }) => {
		const descriptions = descriptionsOf(artifactForStep(evidence, stepId));
		if (!descriptions || descriptions.length === 0) {
			return {
				met: false,
				detail:
					'`credentialSubject.achievement.resultDescription[]` must declare at least one entry.'
			};
		}
		return {
			met: true,
			detail: `The achievement declares ${descriptions.length} result description${descriptions.length === 1 ? '' : 's'}.`
		};
	}
};
