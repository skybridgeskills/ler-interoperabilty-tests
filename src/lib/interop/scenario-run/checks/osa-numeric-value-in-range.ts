import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsById, descriptionsOf, resultsOf, upstreamMissing } from './osa-shape.js';

/**
 * Every numeric result falls inside the bounds its description declares. Ported
 * from `open-skill-alignment.result.numeric-value-in-range`.
 *
 * **Resolution (M11):** no RawScore or Percent results returned `n/a`; it
 * resolves to a **pass** — vacuously satisfied, nothing to violate. A credential
 * carrying only rubric results is not failing this rule, it is outside it.
 */
export const osaNumericValueInRange: AutomaticCheck = {
	id: 'osa-numeric-value-in-range',
	summary: 'Every numeric result falls inside its declared `valueMin`/`valueMax`.',
	run: ({ stepId, evidence }) => {
		const artifact = artifactForStep(evidence, stepId);
		const results = resultsOf(artifact);
		if (!results || results.length === 0) return { met: false, detail: upstreamMissing('result') };
		const descriptions = descriptionsOf(artifact);
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}

		const byId = descriptionsById(descriptions);
		const numeric = results.filter((r) => {
			const type = byId.get(r?.resultDescription as string)?.resultType;
			return type === 'RawScore' || type === 'Percent';
		});
		if (numeric.length === 0) {
			return {
				met: true,
				detail: 'No RawScore or Percent results to range-check — nothing here to violate.'
			};
		}

		const failures: string[] = [];
		for (const result of numeric) {
			const description = byId.get(result?.resultDescription as string)!;
			const raw = result?.value;
			if (typeof raw !== 'string' || raw.length === 0) {
				failures.push(`${String(description.id)}: \`value\` is missing or empty.`);
				continue;
			}
			const value = Number(raw);
			if (Number.isNaN(value)) {
				failures.push(`${String(description.id)}: \`value\` "${raw}" is not numeric.`);
				continue;
			}
			const min =
				typeof description.valueMin === 'string' ? Number(description.valueMin) : undefined;
			const max =
				typeof description.valueMax === 'string' ? Number(description.valueMax) : undefined;
			if (min !== undefined && !Number.isNaN(min) && value < min) {
				failures.push(`${String(description.id)}: ${value} is below \`valueMin\` ${min}.`);
			}
			if (max !== undefined && !Number.isNaN(max) && value > max) {
				failures.push(`${String(description.id)}: ${value} is above \`valueMax\` ${max}.`);
			}
		}
		if (failures.length > 0) return { met: false, detail: failures.join(' ') };
		return {
			met: true,
			detail: `${numeric.length} numeric result${numeric.length === 1 ? ' falls' : 's fall'} inside the declared bounds.`
		};
	}
};
