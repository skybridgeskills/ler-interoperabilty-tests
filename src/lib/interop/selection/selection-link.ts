import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';

/**
 * The homepage selection as a shareable link: `/?roles=…&profiles=…&addons=…`.
 * Carries the selection only — never the Perspective — so a Builder and an
 * Evaluator can exchange links and each see their own framing.
 */
export type SelectionLink = {
	roles: RoleSlug[];
	profiles: ProfileSlug[];
	additiveProfiles: AdditiveProfileSlug[];
};

const PARAMS = { roles: 'roles', profiles: 'profiles', additiveProfiles: 'addons' } as const;

/** Comma-joined slugs per dimension; an empty dimension is omitted, not sent blank. */
export function toSearchParams(selection: SelectionLink): URLSearchParams {
	const params = new URLSearchParams();
	for (const key of ['roles', 'profiles', 'additiveProfiles'] as const) {
		if (selection[key].length > 0) params.set(PARAMS[key], selection[key].join(','));
	}
	return params;
}

/**
 * Read a selection back off a URL. `undefined` when the URL carries none of the
 * three params — the page then keeps the saved selection. Unknown and duplicate
 * slugs are dropped, as `selectionStore.hydrate()` drops them from storage.
 */
export function fromSearchParams(params: URLSearchParams): SelectionLink | undefined {
	if (!Object.values(PARAMS).some((name) => params.has(name))) return undefined;
	return {
		roles: parseList(params.get(PARAMS.roles), (v) => RoleSlug.schema.safeParse(v)),
		profiles: parseList(params.get(PARAMS.profiles), (v) => ProfileSlug.schema.safeParse(v)),
		additiveProfiles: parseList(params.get(PARAMS.additiveProfiles), (v) =>
			AdditiveProfileSlug.schema.safeParse(v)
		)
	};
}

/** Whether a URL carries a shared selection at all. */
export function hasSelectionParams(params: URLSearchParams): boolean {
	return Object.values(PARAMS).some((name) => params.has(name));
}

function parseList<T>(
	raw: string | null,
	parse: (value: string) => { success: true; data: T } | { success: false }
): T[] {
	const out: T[] = [];
	for (const part of (raw ?? '').split(',')) {
		const result = parse(part.trim());
		if (result.success && !out.includes(result.data)) out.push(result.data);
	}
	return out;
}
