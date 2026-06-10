import { SvelteSet } from 'svelte/reactivity';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import type { Selection } from '$lib/interop/selection/index.js';

const STORAGE_KEY = 'lits.selection.v1';

type PersistedSelection = {
	roles: string[];
	profiles: string[];
	additiveProfiles: string[];
};

/** Reactive, localStorage-persisted role/profile/additive selection (Svelte 5 runes). */
export function createSelectionStore() {
	let roles = $state<RoleSlug[]>([]);
	let profiles = $state<ProfileSlug[]>([]);
	let additiveProfiles = $state<AdditiveProfileSlug[]>([]);

	function persist(): void {
		if (typeof localStorage === 'undefined') return;
		const payload: PersistedSelection = { roles, profiles, additiveProfiles };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	}

	function toggle<T>(list: T[], value: T): T[] {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}

	function toggleRole(slug: RoleSlug): void {
		roles = toggle(roles, slug);
		persist();
	}

	function toggleProfile(slug: ProfileSlug): void {
		profiles = toggle(profiles, slug);
		persist();
	}

	function isRoleSelected(slug: RoleSlug): boolean {
		return roles.includes(slug);
	}

	function isProfileSelected(slug: ProfileSlug): boolean {
		return profiles.includes(slug);
	}

	function toggleAdditiveProfile(slug: AdditiveProfileSlug): void {
		additiveProfiles = toggle(additiveProfiles, slug);
		persist();
	}

	function isAdditiveProfileSelected(slug: AdditiveProfileSlug): boolean {
		return additiveProfiles.includes(slug);
	}

	/**
	 * Read and validate persisted selection from localStorage. Browser-only;
	 * call from a consumer's `onMount`. Malformed JSON or unknown slugs are
	 * dropped silently — this never throws.
	 */
	function hydrate(): void {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return;
		}
		if (typeof parsed !== 'object' || parsed === null) return;
		const data = parsed as Partial<PersistedSelection>;
		const rawRoles = Array.isArray(data.roles) ? data.roles : [];
		const rawProfiles = Array.isArray(data.profiles) ? data.profiles : [];
		// Backward compatible: pre-additive payloads omit this field → [].
		const rawAdditives = Array.isArray(data.additiveProfiles) ? data.additiveProfiles : [];

		const validRoles: RoleSlug[] = [];
		for (const slug of rawRoles) {
			const result = RoleSlug.schema.safeParse(slug);
			if (result.success && !validRoles.includes(result.data)) validRoles.push(result.data);
		}
		const validProfiles: ProfileSlug[] = [];
		for (const slug of rawProfiles) {
			const result = ProfileSlug.schema.safeParse(slug);
			if (result.success && !validProfiles.includes(result.data)) validProfiles.push(result.data);
		}
		const validAdditives: AdditiveProfileSlug[] = [];
		for (const slug of rawAdditives) {
			const result = AdditiveProfileSlug.schema.safeParse(slug);
			if (result.success && !validAdditives.includes(result.data)) validAdditives.push(result.data);
		}

		roles = validRoles;
		profiles = validProfiles;
		additiveProfiles = validAdditives;
	}

	return {
		get roles(): readonly RoleSlug[] {
			return roles;
		},
		get profiles(): readonly ProfileSlug[] {
			return profiles;
		},
		get additiveProfiles(): readonly AdditiveProfileSlug[] {
			return additiveProfiles;
		},
		get selection(): Selection {
			// SvelteSet satisfies the plain Set shape `Selection` expects and
			// keeps the eslint svelte/prefer-svelte-reactivity rule happy. The
			// returned snapshot is rebuilt on every read and never mutated.
			return { roles: new SvelteSet(roles), profiles: new SvelteSet(profiles) };
		},
		toggleRole,
		toggleProfile,
		toggleAdditiveProfile,
		isRoleSelected,
		isProfileSelected,
		isAdditiveProfileSelected,
		hydrate
	};
}

/** Shared singleton. Call `selectionStore.hydrate()` from a browser `onMount`. */
export const selectionStore = createSelectionStore();
