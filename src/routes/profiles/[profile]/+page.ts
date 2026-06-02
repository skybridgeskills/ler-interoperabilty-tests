import { error } from '@sveltejs/kit';

import {
	additiveProfileBySlug,
	allAdditiveProfiles,
	allProfiles,
	profileBySlug
} from '$lib/interop/index.js';

export const prerender = true;

export const entries = () => [
	...allProfiles.map((p) => ({ profile: p.slug as string })),
	...allAdditiveProfiles.map((p) => ({ profile: p.slug as string }))
];

export function load({ params }: { params: { profile: string } }) {
	const base = profileBySlug(params.profile);
	if (base) return { kind: 'base' as const, profile: base };

	const additive = additiveProfileBySlug(params.profile);
	if (additive) return { kind: 'additive' as const, profile: additive };

	error(404, 'Unknown profile.');
}
