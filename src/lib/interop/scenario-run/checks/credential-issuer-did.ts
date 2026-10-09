import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep, issuerFlowForStep } from '../evidence.js';

import { issuerDidMethodResult } from './credential-issuer-did-method.js';
import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The issuer DID uses a supported method **and** the credential verified against
 * it. Ported from the direct page's `issuer-did-method` row and the live pages'
 * `issuer-did` row, which asserted both halves in sequence — the method first,
 * then the verification, so a failure names which half went wrong.
 *
 * This is the one `credential-*` check that reads the wire summary as well as
 * the artifact, because "did it verify" is the intake's observation, not a
 * property of the JSON.
 */
export const credentialIssuerDid: AutomaticCheck = {
	id: 'credential-issuer-did',
	summary: 'The issuer DID resolves and the credential verifies against it.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		const method = issuerDidMethodResult(credential);
		if (!method.met) return method;

		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step recorded no intake to verify against.' };
		if (flow.verified) {
			return { met: true, detail: `${method.detail} The credential verified.` };
		}
		return {
			met: false,
			detail: `${method.detail} The credential did not verify: ${flow.verifyErrors?.join('; ') || 'no reason reported'}.`
		};
	}
};
