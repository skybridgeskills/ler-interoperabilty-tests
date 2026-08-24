import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeVariable } from '../evidence.js';

/**
 * The exchange records the OID4VP query language we asked in.
 *
 * **Presence alone is the proof.** Upstream, `oid4vpQueryLanguage` is
 * `.optional()` with no `.default()`, and this suite is the only party that ever
 * sets it — so the variable appears on the stored exchange **if and only if** we
 * sent it and the service knows the field. Nothing is compared against what was
 * asked for; a comparison would need an evidence field that presence makes
 * unnecessary.
 *
 * **The wording names the harness, not the wallet.** A stripped variable is this
 * deployment's shortfall — an older transaction service that does not know the
 * field — and a reader must not take it for a defect in the wallet they are
 * testing.
 */
export const oid4vpQueryLanguageRecorded: AutomaticCheck = {
	id: 'oid4vp-query-language-recorded',
	summary: 'The verifier asked in the query language this scenario pinned.',
	run: ({ stepId, evidence }) => {
		const value = exchangeVariable(evidence, stepId, 'oid4vpQueryLanguage');
		return value !== undefined
			? { met: true, detail: `The exchange records the query language \`${String(value)}\`.` }
			: {
					met: false,
					detail:
						'The exchange records no query language — this deployment may not support it, ' +
						'so the verifier asked in the service’s default instead.'
				};
	}
};
