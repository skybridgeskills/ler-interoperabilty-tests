import type { AdditiveProfileSlug } from './additive-profile-schema.js';
import type { ProfileSlug, RoleSlug, WorkflowSlug } from './profile-schema.js';

import { resolve } from '$app/paths';

/**
 * Build the URL for a (role, workflow, profile) checklist page using the
 * SvelteKit typed `resolve()` helper. The role determines the route prefix.
 */
export function checklistHref(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): string {
	switch (role) {
		case 'issuer':
			return resolve('/issuer/[workflow]/[profile]', { workflow, profile });
		case 'wallet':
			return resolve('/wallet/[workflow]/[profile]', { workflow, profile });
		case 'verifier':
			return resolve('/verifier/[workflow]/[profile]', { workflow, profile });
	}
}

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
