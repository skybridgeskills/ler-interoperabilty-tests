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
	type Profile,
	type ProfileSlug,
	profileHref,
	roleHref,
	type RoleSlug,
	rolesOfAdditiveProfile
} from '$lib/interop/index.js';

import type { FilterPanelItem } from './filter-panel-item.js';

/**
 * A profile's name without the trailing "Profile" — the bar has one line, and
 * "VCALM Profile, OID4 Profile" spends most of it saying "Profile" twice.
 */
export function shortProfileName(profile: Profile | AdditiveProfile): string {
	return profile.name.replace(/\s+Profile$/, '');
}

export function roleItems(selected: Set<RoleSlug>): FilterPanelItem[] {
	return allRoles.map((role) => ({
		slug: role.slug,
		title: role.plural,
		body: role.blurb,
		docHref: roleHref(role.slug),
		docLabel: `About ${role.plural.toLowerCase()}`,
		selected: selected.has(role.slug)
	}));
}

export function profileItems(selected: Set<ProfileSlug>): FilterPanelItem[] {
	return allProfiles.map((profile) => ({
		slug: profile.slug,
		title: profile.name,
		body: profile.description,
		docHref: profileHref(profile.slug),
		docLabel: 'Read the profile',
		selected: selected.has(profile.slug)
	}));
}

export function additiveItems(
	offered: AdditiveProfile[],
	selected: Set<AdditiveProfileSlug>
): FilterPanelItem[] {
	return offered.map((additive) => ({
		slug: additive.slug,
		title: additive.name,
		body: additive.description,
		docHref: additiveProfileHref(additive.slug),
		docLabel: 'Read the add-on',
		meta: `For ${rolesOfAdditiveProfile(additive).join(', ')} · layers on ${
			additive.appliesToBaseProfiles.length
		} base profiles`,
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
