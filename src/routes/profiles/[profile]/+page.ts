import { error } from '@sveltejs/kit';

import { allProfiles, profileBySlug } from '$lib/interop/index.js';

export const prerender = true;

export const entries = () => allProfiles.map((p) => ({ profile: p.slug }));

export function load({ params }: { params: { profile: string } }) {
	const profile = profileBySlug(params.profile);
	if (!profile) error(404, 'Unknown profile.');
	return { profile };
}
