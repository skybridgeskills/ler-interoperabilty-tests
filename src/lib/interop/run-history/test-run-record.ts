import { z } from 'zod';

import { ProfileSlug, RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import type { RunStateDerivation } from '$lib/interop/runner-state.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { RequirementStatus } from './requirement-status.js';

/** Outcome of a single recorded test run. */
export const RunStatus = ZodFactory(z.enum(['passed', 'failed', 'incomplete']));
export type RunStatus = ReturnType<typeof RunStatus>;

/**
 * A persisted record of one test run for a (role, workflow, profile)
 * combination. The v2 shape is flat and framework-free: it stores the overall
 * `status`, a per-requirement `statuses` map (keyed by requirement id), and a
 * `checklistFingerprint` used to detect drift against the live checklist. The
 * localStorage store handles retention/persistence.
 */
export const TestRunRecord = ZodFactory(
	z.object({
		id: z.string().default(() => crypto.randomUUID()),
		role: RoleSlug.schema,
		workflow: WorkflowSlug.schema,
		profile: ProfileSlug.schema,
		ranAt: z.string().default(() => new Date().toISOString()), // ISO timestamp
		status: RunStatus.schema,
		/** djb2 fingerprint of the combined checklist this run scored against. */
		checklistFingerprint: z.string(),
		/** Presentation-ready per-requirement statuses, keyed by requirement id. */
		statuses: z.record(z.string(), RequirementStatus.schema),
		/** Fatal error that aborted the run, if any. */
		error: z.object({ message: z.string(), hint: z.string().optional() }).optional(),
		pinned: z.boolean().optional() // reserved for future manual-pin feature (MVP: unset)
	})
);
export type TestRunRecord = ReturnType<typeof TestRunRecord>;

/**
 * Assemble + validate a v2 run record. `id` and `ranAt` default in the factory,
 * so callers supply only the run's semantic content.
 */
export function testRunRecord(args: {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
	status: RunStatus;
	checklistFingerprint: string;
	statuses: Record<string, RequirementStatus>;
	error?: { message: string; hint?: string };
}): TestRunRecord {
	return TestRunRecord({ ...args });
}

/** Derive a run status from an exchange-runner derivation. */
export function statusFromExchange(d: RunStateDerivation): RunStatus {
	if (d.run === 'complete') return 'passed';
	if (d.run === 'error') return 'failed';
	return 'incomplete';
}

/** Derive a run status from an issuer-report result. */
export function statusFromIssuerReport(r: { verified: boolean; fatalError?: unknown }): RunStatus {
	if (r.fatalError) return 'failed';
	return r.verified ? 'passed' : 'failed';
}

/** Derive a run status from a wallet-runner result. */
export function statusFromWalletReport(r: {
	verified: boolean;
	exchangeState: 'pending' | 'active' | 'complete' | 'invalid';
}): RunStatus {
	if (r.exchangeState === 'invalid') return 'failed';
	if (r.exchangeState !== 'complete') return 'incomplete';
	return r.verified ? 'passed' : 'failed';
}

/**
 * Derive a run status from a verifier-report result. There is no exchange
 * state to consider — an abandoned run simply never records.
 */
export function statusFromVerifierReport(r: { verified: boolean }): RunStatus {
	return r.verified ? 'passed' : 'failed';
}
