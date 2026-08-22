import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';

/**
 * The user's current role and profile selection.
 *
 * This module used to carry the `(role, workflow, profile)` combination helpers
 * too — the combination type and its `isCombinationSelected` /
 * `sortCombinations` helpers, which the homepage used to filter its legacy
 * rows. M13 deleted the
 * combination surface; the filter bar filters **completion groups** now, and the
 * only thing it still needs from here is the shape of what is selected.
 */
export type Selection = { roles: Set<RoleSlug>; profiles: Set<ProfileSlug> };
