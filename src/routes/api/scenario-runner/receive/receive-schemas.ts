import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Receive one credential from the operator's own issuer.
 *
 * `input` is the operator's run-time paste — a credential JSON for `'direct'`,
 * a VC-API interaction URL for `'vcalm'`, an `openid-credential-offer://` URL
 * for `'oid4vci'` — so it is required and non-empty (a blank value is a 400, not
 * a delivery miss). `keyProofSuite` is the suite's own holder key-proof
 * cryptosuite; absent means the default, and `'direct'` ignores it.
 */
export const ReceiveRequest = ZodFactory(
	z.object({
		transport: z.enum(['direct', 'vcalm', 'oid4vci']),
		input: z.string().min(1),
		keyProofSuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).optional()
	})
);
export type ReceiveRequest = ReturnType<typeof ReceiveRequest>;
