import { z } from 'zod';

import { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import { WalletActivity } from '$lib/interop/wallet-activity.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/oid4/inspect`. `input` is the
 * operator's pasted authorization request in any accepted form
 * (`openid4vp://` deep link, bare `request_uri` URL, or raw request JSON);
 * `cryptosuite` selects the suite the seeded match credential is issued with.
 */
export const InspectRequest = ZodFactory(
	z.object({
		input: z.string().min(1),
		cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).default('eddsa-rdfc-2022')
	})
);
export type InspectRequest = ReturnType<typeof InspectRequest>;

/**
 * Client-safe echo of the resolved authorization request for the wallet log —
 * deliberately small (no presentation-definition dump). Present only when the
 * request resolved and validated.
 */
export const RequestSummary = ZodFactory(
	z.object({
		clientId: z.string(),
		responseUri: z.string(),
		responseMode: z.string(),
		/** Whether the input carried the request inline or by `request_uri` reference. */
		form: z.enum(['inline', 'by-reference']),
		noncePresent: z.boolean()
	})
);
export type RequestSummary = ReturnType<typeof RequestSummary>;

/**
 * 200 response of the inspect endpoint: the automated floor outcomes
 * (source `automated`, keyed by the `oid4.verifier-*` floor row ids — P3's
 * score endpoint forwards them as `automatedOutcomes`), the narrated wallet
 * activity, and the optional {@link RequestSummary}.
 */
export const InspectResponse = ZodFactory(
	z.object({
		outcomes: z.array(VerifierCheckOutcome.schema),
		activity: z.array(WalletActivity.schema),
		requestSummary: RequestSummary.schema.optional()
	})
);
export type InspectResponse = ReturnType<typeof InspectResponse>;
