import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Result tone of one wallet-activity entry. Aligns with the shared status
 * language used across the runnable checklist and result presentation so the
 * activity icons read as one system.
 *
 * - `ok` — the interaction/check succeeded.
 * - `fail` — the interaction/check failed (blocking for interactions).
 * - `warn` — nominally completed but with a caveat (e.g. unverified proof).
 * - `info` — a neutral, non-graded step (e.g. "loaded delivered credential").
 * - `skipped` — recorded-but-not-run (reserved; the MVP mappers omit non-run
 *   steps rather than emitting `skipped`).
 */
export const WalletActivityStatus = ZodFactory(z.enum(['ok', 'fail', 'warn', 'info', 'skipped']));
export type WalletActivityStatus = ReturnType<typeof WalletActivityStatus>;

/**
 * One ordered thing the test wallet did, in the order it was performed: an
 * interaction with the system under test (`kind: 'interaction'`) or a
 * verification test it ran (`kind: 'check'`).
 *
 * `stepIndex` (0-based) optionally ties the entry to a left-column checklist
 * step for cross-highlighting; detailed per-requirement results stay in the
 * runnable checklist, not here.
 *
 * Naming: this is the singular entry type, so the endpoint field reads
 * `walletActivity: WalletActivity[]`.
 */
export const WalletActivity = ZodFactory(
	z.object({
		id: z.string().min(1),
		kind: z.enum(['interaction', 'check']),
		label: z.string().min(1),
		status: WalletActivityStatus.schema,
		detail: z.string().optional(),
		stepIndex: z.number().int().nonnegative().optional()
	})
);
export type WalletActivity = ReturnType<typeof WalletActivity>;

/**
 * A high-level summary of an artifact the exchange produced. Today the only
 * artifact kind is a received/pasted credential; the shape is intentionally
 * display-oriented (title, issuer, dates) rather than the full credential.
 */
export const WalletArtifact = ZodFactory(
	z.object({
		kind: z.literal('credential'),
		title: z.string().min(1),
		issuer: z.string().optional(),
		issuanceDate: z.string().optional(),
		verified: z.boolean(),
		types: z.array(z.string()).optional()
	})
);
export type WalletArtifact = ReturnType<typeof WalletArtifact>;
