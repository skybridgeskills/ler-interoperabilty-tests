/**
 * The catalog, shaped into the cards a filter panel renders.
 *
 * Pure functions over the interop catalog plus the current selection: the bar
 * decides what is *offered*, these decide how each offer reads. Kept out of
 * `FilterBar.svelte` so the component is about interaction, not content.
 */
import {
	type AdditiveProfile,
	additiveProfileHref,
	type AdditiveProfileSlug,
	allAdditiveProfiles,
	allProfiles,
	allRoles,
	type ProfileSlug,
	profileHref,
	roleHref,
	type RoleSlug,
	rolesOfAdditiveProfile
} from '$lib/interop/index.js';
import { type Perspective, perspectiveCopy } from '$lib/interop/perspective/index.js';
import { profileMismatch } from '$lib/interop/selection/index.js';

import type { FilterPanelItem } from './filter-panel-item.js';

export function roleItems(
	selected: Set<RoleSlug>,
	perspective: Perspective | undefined
): FilterPanelItem[] {
	return allRoles.map((role) => ({
		slug: role.slug,
		title: role.plural,
		body: role.blurb,
		docHref: roleHref(role.slug),
		docLabel: `About ${role.plural.toLowerCase()}`,
		example: role.example && perspectiveCopy(role.example, perspective),
		selected: selected.has(role.slug)
	}));
}

/**
 * A Standard Profile with no scenario set for any selected role stays offered,
 * annotated with the roles it does cover — dropping it would hide the reason a
 * selection comes back empty.
 */
export function profileItems(
	selected: Set<ProfileSlug>,
	perspective: Perspective | undefined,
	roles: Set<RoleSlug> = new Set()
): FilterPanelItem[] {
	return allProfiles.map((profile) => ({
		slug: profile.slug,
		title: profile.name,
		body: profile.description,
		docHref: profileHref(profile.slug),
		docLabel: 'Read the Standard Profile',
		example: profile.example && perspectiveCopy(profile.example, perspective),
		warning: profileMismatch(profile.slug, [...roles]),
		selected: selected.has(profile.slug)
	}));
}

export function additiveItems(
	offered: AdditiveProfile[],
	selected: Set<AdditiveProfileSlug>,
	perspective: Perspective | undefined
): FilterPanelItem[] {
	return offered.map((additive) => ({
		slug: additive.slug,
		title: additive.name,
		body: additive.description,
		docHref: additiveProfileHref(additive.slug),
		docLabel: 'Read the add-on',
		example: additive.example && perspectiveCopy(additive.example, perspective),
		meta: `For ${rolesOfAdditiveProfile(additive).join(', ')} · layers on ${
			additive.appliesToBaseProfiles.length
		} Standard Profiles`,
		selected: selected.has(additive.slug)
	}));
}

/**
 * Named rather than silently omitted: an add-on the reader has heard of and cannot
 * see here is absent for a reason, and the reason is their role selection.
 */
export function unofferedAdditiveNote(offered: AdditiveProfile[]): string | undefined {
	const missing = allAdditiveProfiles.length - offered.length;
	if (missing <= 0) return undefined;
	return missing === 1
		? '1 more add-on applies to roles you have not selected.'
		: `${missing} more add-ons apply to roles you have not selected.`;
}
