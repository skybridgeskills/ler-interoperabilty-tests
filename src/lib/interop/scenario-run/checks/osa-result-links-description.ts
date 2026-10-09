import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { descriptionsOf, resultsOf, upstreamMissing } from './osa-shape.js';

/**
 * Every result names a result description the achievement actually declares.
 * Ported 1:1 from `open-skill-alignment.result.links-description` — the row that
 * makes a performance scale mean something, rather than being two unrelated
 * lists.
 */
export const osaResultLinksDescription: AutomaticCheck = {
	id: 'osa-result-links-description',
	summary: 'Every `result` links to a declared `resultDescription`.',
	run: ({ stepId, evidence }) => {
		const artifact = artifactForStep(evidence, stepId);
		const results = resultsOf(artifact);
		if (!results || results.length === 0) return { met: false, detail: upstreamMissing('result') };
		const descriptions = descriptionsOf(artifact);
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}
		const declared = new Set(
			descriptions.map((d) => d?.id).filter((id): id is string => typeof id === 'string')
		);
		const unlinked = results.filter((r) => !declared.has(r?.resultDescription as string));
		if (unlinked.length > 0) {
			return {
				met: false,
				detail: `${unlinked.length} result${unlinked.length === 1 ? '' : 's'} reference a \`resultDescription\` id the achievement does not declare.`
			};
		}
		return { met: true, detail: 'Every result links to a result description on the achievement.' };
	}
};
