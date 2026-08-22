import { error } from '@sveltejs/kit';

import { additiveProfileBySlug, profileBySlug } from '$lib/interop/index.js';
import type { CannotServe } from '$lib/interop/scenarios/index.js';

// Blocked-ness is DEPLOYMENT configuration — which cryptosuites this instance's
// tenants can actually issue — so it cannot be baked into a prerendered build.
// Two deployments of the same commit legitimately disagree about it. `+page.server.ts`
// resolves it per request and `adapter-node` renders this on demand, so the flip
// from `true` costs nothing at deploy time; it is not the regression it looks like.
// The `entries()` list that enumerated every profile slug for the prerenderer went
// with it — nothing else read it.
export const prerender = false;

/**
 * Resolve the profile, and carry the server load's `blocked` map through.
 *
 * A universal load's return value **replaces** the server load's data rather
 * than merging with it, so forwarding `data.blocked` here is what makes it reach
 * the page at all — the same shape `/scenarios/[slug]` uses.
 */
export function load({
	params,
	data
}: {
	params: { profile: string };
	data: { blocked: Record<string, CannotServe> };
}) {
	const base = profileBySlug(params.profile);
	if (base) return { kind: 'base' as const, profile: base, blocked: data.blocked };

	const additive = additiveProfileBySlug(params.profile);
	if (additive) return { kind: 'additive' as const, profile: additive, blocked: data.blocked };

	error(404, 'Unknown profile.');
}
