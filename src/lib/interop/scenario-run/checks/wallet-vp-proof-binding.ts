import type { AutomaticCheck } from '../automatic-checks.js';

import {
	NO_PRESENTATION,
	presentationVerifiedFor,
	presentedVpFor,
	requestDomainFor,
	vpProofOf
} from './presented-vp.js';

/**
 * The presentation proof is bound to *this* request — a `challenge` carrying the
 * request nonce, and a `domain` carrying its audience.
 *
 * Ported from `{oid4,vcalm}.wallet.credential-presentation.proof-binding`, the
 * one presentation row both profiles declared and the engine registered for
 * both.
 *
 * **The engine's `warn` branch resolves to fail.** A proof with a challenge but
 * no domain is a challenge-only binding, and the engine warned on it; both
 * profiles' rows demand challenge *and* domain, so a partial binding is a failed
 * requirement, not a caveat. Without a domain the presentation is replayable at
 * a different verifier, which is the thing the row exists to prevent.
 *
 * When the exchange echoes no expected domain (VCALM records no `client_id`),
 * the check falls back to presence plus verifier-core's verdict — which enforced
 * the binding — rather than failing a wallet for the exchange record's silence.
 */
export const walletVpProofBinding: AutomaticCheck = {
	id: 'wallet-vp-proof-binding',
	summary: 'The presentation proof is bound to the request’s challenge and audience.',
	run: ({ stepId, evidence }) => {
		const vp = presentedVpFor(evidence, stepId);
		if (vp === undefined) return { met: false, detail: NO_PRESENTATION };

		const proof = vpProofOf(vp);
		const challenge = proof?.challenge;
		if (typeof challenge !== 'string' || challenge.length === 0) {
			return { met: false, detail: 'The presentation proof carries no `challenge`.' };
		}

		const domain = typeof proof?.domain === 'string' ? proof.domain : undefined;
		const expected = requestDomainFor(evidence, stepId);
		if (expected) {
			return domain === expected
				? { met: true, detail: 'The proof’s `challenge` and `domain` are bound to this request.' }
				: {
						met: false,
						detail: `The proof’s \`domain\` is ${domain ? `\`${domain}\`` : 'absent'} — this request’s audience is \`${expected}\`.`
					};
		}
		if (!domain) {
			return {
				met: false,
				detail:
					'The proof carries a `challenge` but no `domain`, so it is bound to this exchange but not to this verifier.'
			};
		}
		return presentationVerifiedFor(evidence, stepId)
			? {
					met: true,
					detail: 'The proof carries a `challenge` and a `domain`, and the verifier enforced both.'
				}
			: { met: false, detail: 'The proof carries a binding, but it did not verify.' };
	}
};
