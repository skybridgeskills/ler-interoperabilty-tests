import type { CheckResult } from '../automatic-checks.js';
import type { RunEvidence } from '../evidence.js';

import { NO_PRESENTATION, presentedVpFor, vpCryptosuiteOf, vpHolderDidOf } from './presented-vp.js';

/**
 * The shared holder-key assertions behind the `data-integrity-cryptosuites`
 * wallet **producer** scenarios, parameterised by which cryptosuite the calling
 * scenario is about.
 *
 * The producer axis is **observed, never pinned**: the suite plays verifier and
 * cannot choose which key a wallet signs with, exactly as an issuer scenario
 * cannot choose the operator's issuing suite. So a wallet that only holds an
 * Ed25519 key passes the eddsa scenario and fails the ecdsa one, and that
 * asymmetry is the measurement.
 *
 * Ported from `wallet-runner/checks/data-integrity-presentation.ts`.
 */

/** Multibase prefix a `did:key` carries for each cryptosuite's key type. */
const DID_KEY_PREFIX: Record<string, string> = {
	'eddsa-rdfc-2022': 'did:key:z6Mk', // Ed25519
	'ecdsa-rdfc-2019': 'did:key:zDna' // P-256
};

/** The presentation was signed with `cryptosuite`. */
export function vpCryptosuiteResult(
	evidence: RunEvidence,
	stepId: string,
	cryptosuite: string
): CheckResult {
	const vp = presentedVpFor(evidence, stepId);
	if (vp === undefined) return { met: false, detail: NO_PRESENTATION };

	const signed = vpCryptosuiteOf(vp);
	if (!signed) {
		return { met: false, detail: 'The presentation proof declares no `cryptosuite`.' };
	}
	return signed === cryptosuite
		? { met: true, detail: `The presentation was signed with \`${cryptosuite}\`.` }
		: {
				met: false,
				detail: `The presentation was signed with \`${signed}\` — this scenario measures \`${cryptosuite}\`.`
			};
}

/**
 * The holder key type matches `cryptosuite`.
 *
 * **Vacuously passes for a non-`did:key` holder.** The rule is about the
 * multibase prefix a `did:key` encodes, and a `did:web` holder gives it nothing
 * to apply to — nothing violates it, so it passes, following the same line the
 * issuer migration drew between "no rows to bound" (vacuous pass) and "the input
 * is missing because something upstream failed" (fail).
 *
 * Kept, where the issuer's `key-type-matches` analogue was dropped: that one
 * needed DID resolution and was never registered, while this one reads a prefix
 * off a string the presentation already carries.
 */
export function holderKeyTypeResult(
	evidence: RunEvidence,
	stepId: string,
	cryptosuite: string
): CheckResult {
	const vp = presentedVpFor(evidence, stepId);
	if (vp === undefined) return { met: false, detail: NO_PRESENTATION };

	const did = vpHolderDidOf(vp);
	if (!did) return { met: false, detail: 'The presentation names no holder DID.' };
	if (!did.startsWith('did:key:')) {
		return {
			met: true,
			detail: `Holder \`${did}\` is not a \`did:key\`, so there is no encoded key type to check.`
		};
	}
	const expected = DID_KEY_PREFIX[cryptosuite];
	return expected && did.startsWith(expected)
		? {
				met: true,
				detail: `The holder’s \`did:key\` encodes a key type matching \`${cryptosuite}\`.`
			}
		: {
				met: false,
				detail: `The holder’s \`did:key\` does not encode a key type matching \`${cryptosuite}\` (expected the \`${expected}…\` prefix).`
			};
}
