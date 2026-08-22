import type { AutomaticCheck } from '../automatic-checks.js';

import { NO_PRESENTATION, presentedVpFor, vpProofOf } from './presented-vp.js';

/**
 * The presentation is a Data Integrity presentation (`ldp_vp`), not a compact
 * JWT VP.
 *
 * Ported from `oid4.wallet.credential-presentation.di-vp-not-jwt`. A compact JWT
 * VP arrives as a **string**, which is why the reader hands back whatever was
 * echoed rather than narrowing to an object — the string case is a real,
 * legible failure, not an absence.
 *
 * The VCALM scenario declares this row too, though the VCALM legacy list never
 * did: the check reads the same echoed VP either way, so scoring it costs
 * nothing and leaving it unscored would have been an accident of which legacy list
 * happened to list it. `mapping.md` § 4 records the gained coverage.
 *
 * The engine's `n/a` no-presentation branch resolves to **fail**.
 */
export const walletVpDiNotJwt: AutomaticCheck = {
	id: 'wallet-vp-di-not-jwt',
	summary: 'The presentation is a Data Integrity `ldp_vp`, not a JWT VP.',
	run: ({ stepId, evidence }) => {
		const vp = presentedVpFor(evidence, stepId);
		if (vp === undefined) return { met: false, detail: NO_PRESENTATION };
		if (typeof vp === 'string') {
			return {
				met: false,
				detail: 'The presentation is a compact JWT string, not a Data Integrity presentation.'
			};
		}
		const type = vpProofOf(vp)?.type;
		return type === 'DataIntegrityProof'
			? { met: true, detail: 'The presentation carries a `DataIntegrityProof`.' }
			: {
					met: false,
					detail: `\`proof.type\` is ${typeof type === 'string' ? `\`${type}\`` : 'absent'} — this requires \`DataIntegrityProof\`.`
				};
	}
};
