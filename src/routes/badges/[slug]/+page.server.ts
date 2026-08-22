import { error } from '@sveltejs/kit';

import {
	badgeBySlug,
	badgeFingerprint,
	criteriaNarrative,
	scenariosBehindBadge
} from '$lib/interop/badges/index.js';
import { appContext } from '$lib/server/app-context.js';
import { badgeIds } from '$lib/server/domain/badges/index.js';
import { blockedScenarios } from '$lib/server/domain/scenario-runner/index.js';

/**
 * Resolve the badge, its current version, the `?v=` verdict, and its
 * achievement/criteria ids — all from the **definition and catalog alone**, so
 * the page is stranger-safe and SSR-correct. `localStorage` (completion, prior
 * claims) is untouched here; the earner overlay is computed in the browser.
 *
 * `blocked` is resolved server-side, the way the other three scenario surfaces
 * do it: only the server holds the tenant config, so whether a pinned
 * `(cryptosuite, didMethod)` behind this badge is servable is server knowledge.
 * For the elective base badge nothing is blocked, but a pinned member would
 * block the badge rather than shrink its denominator.
 */
export function load({ params, url }: { params: { slug: string }; url: URL }) {
	const badge = badgeBySlug(params.slug);
	if (!badge) error(404, `Unknown badge: ${params.slug}`);

	const { exchangeRunnerConfig } = appContext();
	const blocked = blockedScenarios(exchangeRunnerConfig, scenariosBehindBadge(badge));

	const currentFingerprint = badgeFingerprint(badge);
	const requestedVersion = url.searchParams.get('v') ?? undefined;
	const versionMismatch = requestedVersion !== undefined && requestedVersion !== currentFingerprint;

	// The ids the page shows are the SAME ones the credential carries — reuse P2's
	// `badgeIds` against the same `badgeRootUrl`, so the criteria link resolves here.
	const { achievementId, criteriaId } = badgeIds(badge, exchangeRunnerConfig.badgeRootUrl);

	return {
		badge,
		criteriaNarrative: criteriaNarrative(badge),
		achievementId,
		criteriaId,
		currentFingerprint,
		versionMismatch,
		blocked
	};
}
