import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The received credential is an Open Badges 3.0 credential. Ported 1:1 from the
 * issuer engine's `openbadgecredential-type` / `openbadge-3` rows; shared across
 * all three transports.
 */
export const credentialOb3Type: AutomaticCheck = {
	id: 'credential-ob3-type',
	summary: 'The credential’s `type` includes `OpenBadgeCredential`.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		const types = credential.type;
		return Array.isArray(types) && types.includes('OpenBadgeCredential')
			? { met: true, detail: '`type` includes `OpenBadgeCredential`.' }
			: { met: false, detail: '`type` must include `OpenBadgeCredential`.' };
	}
};
