import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * URL slug for the three product roles. Wallets play the holder role in the
 * source guide; we use `wallet` to match user-facing terminology.
 */
export const RoleSlug = ZodFactory(z.enum(['issuer', 'wallet', 'verifier']));
export type RoleSlug = ReturnType<typeof RoleSlug>;

/** URL slug for one of the six interoperability workflows. */
export const WorkflowSlug = ZodFactory(
	z.enum([
		'credential-issuance',
		'credential-acceptance',
		'credential-request-and-verification',
		'credential-presentation',
		'direct-credential-issuance',
		'direct-credential-verification'
	])
);
export type WorkflowSlug = ReturnType<typeof WorkflowSlug>;

/** URL slug for one of the three interoperability profiles. */
export const ProfileSlug = ZodFactory(z.enum(['vcalm', 'oid4', 'ob3-direct-delivery']));
export type ProfileSlug = ReturnType<typeof ProfileSlug>;

/** A label/value pair in the "key components" summary on a profile. */
export const ProfileKeyComponent = ZodFactory(z.object({ label: z.string(), value: z.string() }));
export type ProfileKeyComponent = ReturnType<typeof ProfileKeyComponent>;

/**
 * A complete interoperability profile: identity + key technical choices.
 *
 * It used to carry a per-(role, workflow) requirement list, which is what
 * defined the combinations a profile supported. M13 deleted that field and its
 * type family; **a scenario's `memberships` are how a profile claims work now**,
 * and the catalog is the single source of what is measurable.
 */
export const Profile = ZodFactory(
	z.object({
		id: z.string(),
		slug: ProfileSlug.schema,
		name: z.string(),
		version: z.string(),
		status: z.string(),
		url: z.string().url().optional(),
		lastUpdated: z.string(),
		description: z.string(),
		keyComponents: z.array(ProfileKeyComponent.schema),
		useCases: z.array(z.string()),
		notes: z.array(z.string()).optional()
	})
);
export type Profile = ReturnType<typeof Profile>;
