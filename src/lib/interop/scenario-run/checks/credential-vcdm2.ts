import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The received credential is a VC Data Model 2.0 credential. Ported 1:1 from
 * the issuer engine's `vc-data-model-v2-compliant` row (the direct page) and
 * `vcdm-2` (both live pages) — one check for all three, because it reads the
 * credential on `StepEvidence.artifact` and never the wire.
 */
export const credentialVcdm2: AutomaticCheck = {
	id: 'credential-vcdm2',
	summary: 'The credential declares the VC Data Model 2.0 context and type.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		const context = credential['@context'];
		if (!Array.isArray(context) || !context.includes('https://www.w3.org/ns/credentials/v2')) {
			return {
				met: false,
				detail: '`@context` must include `https://www.w3.org/ns/credentials/v2`.'
			};
		}
		const types = credential.type;
		if (!Array.isArray(types) || !types.includes('VerifiableCredential')) {
			return { met: false, detail: '`type` must include `VerifiableCredential`.' };
		}
		return { met: true, detail: 'The VC Data Model 2.0 context and type are both present.' };
	}
};
