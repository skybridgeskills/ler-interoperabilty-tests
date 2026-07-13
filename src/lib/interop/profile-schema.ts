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

/**
 * One MUST / SHOULD / MAY clause inside a checklist step. The level mirrors
 * RFC 2119 conformance language as used by the source profile docs.
 *
 * `id` is a required stable key used by the runner check registries to
 * map a requirement to its automated check function, and by persisted
 * run records to key statuses back to their requirement. It is
 * kebab-case, namespaced by profile slug — e.g.
 * `ob3-direct-delivery.signature-valid`. Where a runner scores a
 * requirement, this id equals the outcome id that runner emits.
 */
export const ChecklistRequirement = ZodFactory(
	z.object({
		id: z.string(),
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		text: z.string()
	})
);
export type ChecklistRequirement = ReturnType<typeof ChecklistRequirement>;

/** One numbered step in a workflow's ordered process flow. */
export const ChecklistStep = ZodFactory(
	z.object({
		title: z.string(),
		summary: z.string(),
		requirements: z.array(ChecklistRequirement.schema)
	})
);
export type ChecklistStep = ReturnType<typeof ChecklistStep>;

/**
 * The implementation checklist for one (role, workflow, profile)
 * combination. The set of checklists belonging to a profile defines which
 * combinations the profile supports.
 */
export const WorkflowChecklist = ZodFactory(
	z.object({
		role: RoleSlug.schema,
		workflow: WorkflowSlug.schema,
		profile: ProfileSlug.schema,
		steps: z.array(ChecklistStep.schema)
	})
);
export type WorkflowChecklist = ReturnType<typeof WorkflowChecklist>;

/** A label/value pair in the "key components" summary on a profile. */
export const ProfileKeyComponent = ZodFactory(z.object({ label: z.string(), value: z.string() }));
export type ProfileKeyComponent = ReturnType<typeof ProfileKeyComponent>;

/**
 * A complete interoperability profile: identity + key technical choices +
 * the per-(role × workflow) checklists that describe how to implement it.
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
		notes: z.array(z.string()).optional(),
		checklists: z.array(WorkflowChecklist.schema)
	})
);
export type Profile = ReturnType<typeof Profile>;
