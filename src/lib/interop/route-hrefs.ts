/**
 * Every route-building helper in the app, in one place.
 *
 * It was named for the combination pages until M13 deleted them. `scenarioHref` lives here rather than beside the catalog
 * accessors because routing is a routing concern, and keeping it here is what
 * stops `interop/scenarios/` depending on `$app/paths`.
 */

import type { AdditiveProfileSlug } from './additive-profile-schema.js';
import type { ProfileSlug, RoleSlug } from './profile-schema.js';

import { resolve } from '$app/paths';

/** Build the URL for a profile detail page. */
export function profileHref(profile: ProfileSlug): string {
	return resolve('/profiles/[profile]', { profile });
}

/**
 * Build the URL for an additive profile detail page. Additive profiles
 * share the `/profiles/[profile]` route with standalone profiles; the
 * loader branches on the resolved profile kind.
 */
export function additiveProfileHref(profile: AdditiveProfileSlug): string {
	return resolve('/profiles/[profile]', { profile });
}

/**
 * Build the URL for a scenario's runner page.
 *
 * Lives here rather than in `scenarios/accessors.ts` because it is a *routing*
 * concern, and this file already owns every route-building helper in the app.
 * Putting it beside the catalog accessors would split routing knowledge across
 * two modules and make `interop/scenarios/` depend on `$app/paths`.
 */
export function scenarioHref(slug: string): string {
	return resolve('/scenarios/[slug]', { slug });
}

/** Build the URL for a role landing page. */
export function roleHref(role: RoleSlug): string {
	switch (role) {
		case 'issuer':
			return resolve('/issuer');
		case 'wallet':
			return resolve('/wallet');
		case 'verifier':
			return resolve('/verifier');
	}
}
