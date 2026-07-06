import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * The subset of an OID4VP v1.0 authorization request the test wallet consumes. Tolerant of
 * extra spec fields we don't use (parsed shape ignores them). `response_mode` is fixed to
 * `direct_post` — the only mode this wallet submits.
 */
export const Oid4vpAuthorizationRequest = ZodFactory(
	z.object({
		client_id: z.string().min(1),
		response_uri: z.string().url(),
		response_mode: z.literal('direct_post'),
		nonce: z.string().min(1),
		presentation_definition: z.object({
			id: z.string().min(1),
			/**
			 * Optional DIF PE top-level format registry (e.g. `{ ldp_vp: {...} }`). The wallet-role
			 * flow ignores it; the verifier-runner floor check reads it to see whether the request
			 * pins a Data Integrity VP format.
			 */
			format: z.record(z.string(), z.unknown()).optional(),
			input_descriptors: z
				.array(
					z.object({
						id: z.string().min(1),
						format: z.record(z.string(), z.unknown()).optional(),
						constraints: z
							.object({
								fields: z
									.array(
										z.object({
											path: z.array(z.string()).min(1),
											filter: z.record(z.string(), z.unknown()).optional()
										})
									)
									.optional()
							})
							.optional()
					})
				)
				.min(1)
		})
	})
);
export type Oid4vpAuthorizationRequest = ReturnType<typeof Oid4vpAuthorizationRequest>;

/**
 * The DIF Presentation Submission the wallet returns alongside the `vp_token`. The wallet
 * presents one credential as a single Data Integrity VP (`ldp_vp`), so there is exactly one
 * descriptor mapping rooted at `$`.
 */
export const PresentationSubmission = ZodFactory(
	z.object({
		id: z.string().min(1),
		definition_id: z.string().min(1),
		descriptor_map: z.array(
			z.object({
				id: z.string().min(1),
				format: z.literal('ldp_vp'),
				path: z.string().min(1)
			})
		)
	})
);
export type PresentationSubmission = ReturnType<typeof PresentationSubmission>;

/** The `direct_post` response body: the signed VP + its submission descriptor. */
export const Oid4vpResponse = ZodFactory(
	z.object({
		vp_token: z.unknown(),
		presentation_submission: PresentationSubmission.schema
	})
);
export type Oid4vpResponse = ReturnType<typeof Oid4vpResponse>;
