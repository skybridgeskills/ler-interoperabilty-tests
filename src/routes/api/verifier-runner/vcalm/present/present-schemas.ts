import { z } from 'zod';

import {
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import { WalletActivity } from '$lib/interop/wallet-activity.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/vcalm/present`: one plan entry, the
 * operator's pasted interaction URL (a FRESH single-use VC-API exchange per
 * credential), and the cryptosuite. The server engages the exchange, signs, and
 * submits.
 */
export const PresentRequest = ZodFactory(
	z.object({
		entry: VerifierRunPlanEntry.schema,
		interactionUrl: z.string().min(1),
		cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).default('eddsa-rdfc-2022')
	})
);
export type PresentRequest = ReturnType<typeof PresentRequest>;

/**
 * 200 response of the present endpoint: transport evidence for this credential,
 * the automated floor for the engaged exchange (the client keeps the first
 * pass's), and the narrated wallet activity. A verifier that errors on the
 * presentation is evidence here, not an HTTP error.
 */
export const PresentResponse = ZodFactory(
	z.object({
		evidence: PresentEvidence.schema,
		floorOutcomes: z.array(VerifierCheckOutcome.schema),
		activity: z.array(WalletActivity.schema)
	})
);
export type PresentResponse = ReturnType<typeof PresentResponse>;
