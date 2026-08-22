import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { ProfileSlug } from './profile-schema.js';

/** URL slug for an additive interoperability profile. */
export const AdditiveProfileSlug = ZodFactory(
	z.enum(['open-skill-alignment', 'data-integrity-cryptosuites'])
);
export type AdditiveProfileSlug = ReturnType<typeof AdditiveProfileSlug>;

/**
 * An interoperability profile that layers on top of one or more base
 * profiles. Additive profiles cannot be run alone: they declare which base
 * profile slugs they apply to via `appliesToBaseProfiles`.
 *
 * They used to contribute extra requirements through their own per-(role,
 * workflow) lists. M13 deleted that field: an additive claims work by being
 * named in a scenario's `memberships`, which is what lets one additive span
 * several base profiles and be counted as a slice of each.
 */
export const AdditiveProfile = ZodFactory(
	z.object({
		id: z.string(),
		slug: AdditiveProfileSlug.schema,
		name: z.string(),
		version: z.string(),
		status: z.string(),
		url: z.string().url().optional(),
		lastUpdated: z.string(),
		description: z.string(),
		appliesToBaseProfiles: z.array(ProfileSlug.schema).min(1)
	})
);
export type AdditiveProfile = ReturnType<typeof AdditiveProfile>;
