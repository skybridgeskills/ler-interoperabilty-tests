import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsOf, upstreamMissing } from './osa-shape.js';

/**
 * Every `Percent` result description declares the required 0–100 bounds. Ported
 * from `open-skill-alignment.result-description.percent-value-range`.
 *
 * **Resolution (M11):** a credential with no `Percent` entries returned `n/a`.
 * It resolves to a **pass** — the requirement is a rule about `Percent` rows,
 * and a credential with none of them violates nothing. That is a vacuous
 * satisfaction, and it is deliberate: do not "fix" it to a fail, which would
 * punish an issuer for using RawScore.
 */
export const osaPercentValueRange: AutomaticCheck = {
	id: 'osa-percent-value-range',
	summary: 'Every `Percent` result description declares `valueMin: "0"` / `valueMax: "100"`.',
	run: ({ stepId, evidence }) => {
		const descriptions = descriptionsOf(artifactForStep(evidence, stepId));
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}
		const percents = descriptions.filter((d) => d?.resultType === 'Percent');
		if (percents.length === 0) {
			return {
				met: true,
				detail: 'No `Percent` result descriptions to bound — nothing here to violate.'
			};
		}
		const offenders = percents.filter((d) => d?.valueMin !== '0' || d?.valueMax !== '100');
		if (offenders.length > 0) {
			return {
				met: false,
				detail: `${offenders.length} \`Percent\` result description${offenders.length === 1 ? '' : 's'} do not declare \`valueMin: "0"\` and \`valueMax: "100"\`.`
			};
		}
		return {
			met: true,
			detail: 'Every `Percent` result description declares bounds of 0 to 100.'
		};
	}
};
