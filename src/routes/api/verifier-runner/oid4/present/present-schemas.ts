import { z } from 'zod';

import { PresentEvidence, VerifierRunPlanEntry } from '$lib/interop/verifier-run/index.js';
import { WalletActivity } from '$lib/interop/wallet-activity.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/oid4/present`: one plan entry, the
 * operator's pasted authorization request (`input`, any accepted form — fresh
 * per credential or the reused previous one), and the cryptosuite. The server
 * generates the fixture, signs, and submits.
 */
export const PresentRequest = ZodFactory(
	z.object({
		entry: VerifierRunPlanEntry.schema,
		input: z.string().min(1),
		cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).default('eddsa-rdfc-2022')
	})
);
export type PresentRequest = ReturnType<typeof PresentRequest>;

/**
 * 200 response of the present endpoint: transport evidence for this credential
 * (scored later by `.../score` — only the valid credential's delivery scores)
 * and the narrated wallet activity for the log. A failed submission is evidence
 * here, not an HTTP error.
 */
export const PresentResponse = ZodFactory(
	z.object({
		evidence: PresentEvidence.schema,
		activity: z.array(WalletActivity.schema)
	})
);
export type PresentResponse = ReturnType<typeof PresentResponse>;
