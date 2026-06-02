import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { ProfileSlug, WorkflowChecklist } from './profile-schema.js';

/** URL slug for an additive interoperability profile. */
export const AdditiveProfileSlug = ZodFactory(
	z.enum(['open-skill-alignment', 'data-integrity-cryptosuites'])
);
export type AdditiveProfileSlug = ReturnType<typeof AdditiveProfileSlug>;

/**
 * An interoperability profile that layers on top of one or more base
 * profiles. Additive profiles cannot be run alone: they declare which
 * base profile slugs they apply to via `appliesToBaseProfiles` and
 * contribute extra requirements via per-(role × workflow) checklists
 * reusing the standard `WorkflowChecklist` shape.
 */
export const AdditiveProfile = ZodFactory(
	z.object({
		id: z.string(),
		slug: AdditiveProfileSlug.schema,
		name: z.string(),
		version: z.string(),
		status: z.string(),
		lastUpdated: z.string(),
		description: z.string(),
		appliesToBaseProfiles: z.array(ProfileSlug.schema).min(1),
		checklists: z.array(WorkflowChecklist.schema)
	})
);
export type AdditiveProfile = ReturnType<typeof AdditiveProfile>;
