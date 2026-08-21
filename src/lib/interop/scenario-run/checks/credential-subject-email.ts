import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, NO_CREDENTIAL, subjectOf } from './credential-shape.js';

/**
 * The credential identifies its subject by an email-based identifier. Ported
 * from the issuer engine's `subject-id-is-email` row.
 *
 * **Resolution (M11):** the engine returned `warn` for a bare `learner@example.edu`
 * — an email, but not the `mailto:` URI OB 3.0 asks for. The automatic model has
 * no `warn`, and this is a MUST, so a bare email now **fails**: the requirement
 * is a `mailto:` URI, and a row that passes on something else would misreport a
 * real interoperability difference.
 */
export const credentialSubjectEmail: AutomaticCheck = {
	id: 'credential-subject-email',
	summary: 'The credential subject is identified by a `mailto:` URI.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		const id = subjectOf(credential)?.id;
		if (typeof id !== 'string') {
			return { met: false, detail: '`credentialSubject.id` is missing or is not a string.' };
		}
		if (id.startsWith('mailto:') && id.length > 'mailto:'.length) {
			return { met: true, detail: '`credentialSubject.id` is a `mailto:` URI.' };
		}
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
			return {
				met: false,
				detail:
					'`credentialSubject.id` is a bare email address — OB 3.0 requires a `mailto:` URI (`mailto:learner@example.edu`).'
			};
		}
		return {
			met: false,
			detail:
				'`credentialSubject.id` must be an email-based identifier, such as `mailto:learner@example.edu`.'
		};
	}
};
