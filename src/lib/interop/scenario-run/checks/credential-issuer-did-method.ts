import type { AutomaticCheck, CheckResult } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, issuerIdOf, NO_CREDENTIAL } from './credential-shape.js';

/** The DID methods an issuer identifier may use. Shared with {@link credentialIssuerDid}. */
export function issuerDidMethodResult(credential: Record<string, unknown>): CheckResult {
	const id = issuerIdOf(credential);
	if (!id) return { met: false, detail: 'The credential names no `issuer.id`.' };
	if (id.startsWith('did:web:') || id.startsWith('did:key:')) {
		return { met: true, detail: `The issuer uses \`${id.split(':').slice(0, 2).join(':')}\`.` };
	}
	return { met: false, detail: 'The issuer DID must use the `did:web` or `did:key` method.' };
}

/**
 * The issuer identifier uses a supported DID method — **method only**, with no
 * claim about whether the credential verified.
 *
 * Split out from `credential-issuer-did` (which asserts both) because the DIC
 * producer scenarios ask exactly this and nothing more: the base scenario has
 * already asserted the credential verifies, so repeating it inside the additive
 * would make the same failure show up twice.
 */
export const credentialIssuerDidMethod: AutomaticCheck = {
	id: 'credential-issuer-did-method',
	summary: 'The issuer is identified by a `did:web` or `did:key` DID.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		return issuerDidMethodResult(credential);
	}
};
