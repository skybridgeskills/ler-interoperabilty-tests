import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { classifyTargetUrl, ctdlHostAllowlist, safeHost } from './osa-ctdl-allowlist.js';
import { descriptionsOf, upstreamMissing } from './osa-shape.js';

/**
 * Your result descriptions align to the CTDL Credential Registry. Ported from
 * `open-skill-alignment.result-description.ctdl-alignment`, the only SHOULD in
 * the family.
 *
 * **Resolution (M11):** the engine had two `warn` branches — no
 * `alignment.targetUrl` entries at all, and entries pointing outside the
 * allowlist. Both resolve to a **fail**, at SHOULD level, which records and
 * shows the gap without blocking the scenario. The requirement is that CTDL
 * alignments are present and resolvable; neither branch evidences that. The
 * message keeps naming the allowlisted hosts and noting that more registries may
 * be blessed later, because both branches are a reasonable state to be in.
 */
export const osaCtdlAlignment: AutomaticCheck = {
	id: 'osa-ctdl-alignment',
	summary: 'Your result descriptions carry CTDL Credential Registry alignments.',
	run: ({ stepId, evidence }) => {
		const descriptions = descriptionsOf(artifactForStep(evidence, stepId));
		if (!descriptions || descriptions.length === 0) {
			return { met: false, detail: upstreamMissing('resultDescription') };
		}
		const urls = descriptions
			.flatMap((d) => d?.alignment ?? [])
			.map((a) => (a as { targetUrl?: unknown })?.targetUrl);

		if (urls.length === 0) {
			return {
				met: false,
				detail: `Your result descriptions declare no \`alignment.targetUrl\` entries. They should align to the CTDL Credential Registry (${ctdlHostAllowlist.join(', ')}); more registries may be blessed later.`
			};
		}
		const unparseable = urls.filter((u) => classifyTargetUrl(u) === 'unparseable');
		if (unparseable.length > 0) {
			return {
				met: false,
				detail: `${unparseable.length} \`alignment.targetUrl\` value${unparseable.length === 1 ? ' is not a valid URL' : 's are not valid URLs'}.`
			};
		}
		const offAllowlist = urls.filter((u) => classifyTargetUrl(u) === 'off-allowlist');
		if (offAllowlist.length > 0) {
			const hosts = [...new Set(offAllowlist.map(safeHost))];
			return {
				met: false,
				detail: `${offAllowlist.length} \`alignment.targetUrl\` value${offAllowlist.length === 1 ? '' : 's'} point outside the CTDL Credential Registry (${hosts.join(', ')}). The registry hosts we recognise are ${ctdlHostAllowlist.join(', ')}; more may be blessed later.`
			};
		}
		return {
			met: true,
			detail: `All ${urls.length} \`alignment.targetUrl\` value${urls.length === 1 ? '' : 's'} point at the CTDL Credential Registry.`
		};
	}
};
