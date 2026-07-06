import { z } from 'zod';

import { ProfileSlug, RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import {
	ChecklistRunState,
	StepRunState,
	type RunStateDerivation
} from '$lib/interop/runner-state.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/** Outcome of a single recorded test run. */
export const RunStatus = ZodFactory(z.enum(['passed', 'failed', 'incomplete']));
export type RunStatus = ReturnType<typeof RunStatus>;

/** Snapshot of an exchange-runner run (wallet/verifier flows). */
const ExchangeRunPayload = z.object({
	kind: z.literal('exchange'),
	exchangeId: z.string().optional(),
	exchangeState: z.enum(['pending', 'active', 'complete', 'invalid']),
	derived: z.object({
		run: ChecklistRunState.schema,
		perStep: z.array(StepRunState.schema)
	})
});
export type ExchangeRunPayload = z.infer<typeof ExchangeRunPayload>;

/** Snapshot of an issuer-report run (direct credential verification). */
const IssuerReportRunPayload = z.object({
	kind: z.literal('issuer-report'),
	verified: z.boolean(),
	failingMustCount: z.number().int().nonnegative(),
	fatalError: z.object({ message: z.string(), hint: z.string().optional() }).optional()
});
export type IssuerReportRunPayload = z.infer<typeof IssuerReportRunPayload>;

/** Snapshot of a wallet-runner run (the test wallet completed a holder flow + conformance check). */
const WalletReportRunPayload = z.object({
	kind: z.literal('wallet-report'),
	verified: z.boolean(),
	failingMustCount: z.number().int().nonnegative(),
	exchangeId: z.string().optional(),
	exchangeState: z.enum(['pending', 'active', 'complete', 'invalid'])
});
export type WalletReportRunPayload = z.infer<typeof WalletReportRunPayload>;

/** Snapshot of a verifier-report run (attested acceptance passes scored against ground truth). */
const VerifierReportRunPayload = z.object({
	kind: z.literal('verifier-report'),
	verified: z.boolean(),
	failingMustCount: z.number().int().nonnegative(),
	attestedPassCount: z.number().int().nonnegative()
});
export type VerifierReportRunPayload = z.infer<typeof VerifierReportRunPayload>;

/**
 * A persisted record of one test run for a (role, workflow, profile)
 * combination. Framework-free + validated via the {@link TestRunRecord}
 * factory; the localStorage store handles retention/persistence.
 */
export const TestRunRecord = ZodFactory(
	z.object({
		role: RoleSlug.schema,
		workflow: WorkflowSlug.schema,
		profile: ProfileSlug.schema,
		ranAt: z.string(), // ISO timestamp
		status: RunStatus.schema,
		pinned: z.boolean().optional(), // reserved for future manual-pin feature (MVP: unset)
		payload: z.discriminatedUnion('kind', [
			ExchangeRunPayload,
			IssuerReportRunPayload,
			WalletReportRunPayload,
			VerifierReportRunPayload
		])
	})
);
export type TestRunRecord = ReturnType<typeof TestRunRecord>;

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

/** Assemble + validate a full exchange-run record (stamps `ranAt` now). */
export function exchangeRunRecord(args: {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
	exchangeId?: string;
	exchangeState: 'pending' | 'active' | 'complete' | 'invalid';
	derived: RunStateDerivation;
}): TestRunRecord {
	return TestRunRecord({
		role: args.role,
		workflow: args.workflow,
		profile: args.profile,
		ranAt: new Date().toISOString(),
		status: statusFromExchange(args.derived),
		payload: {
			kind: 'exchange',
			exchangeId: args.exchangeId,
			exchangeState: args.exchangeState,
			derived: { run: args.derived.run, perStep: args.derived.perStep }
		}
	});
}

/** Assemble + validate a full issuer-report run record (stamps `ranAt` now). */
export function issuerReportRunRecord(args: {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
	verified: boolean;
	failingMustCount: number;
	fatalError?: { message: string; hint?: string };
}): TestRunRecord {
	return TestRunRecord({
		role: args.role,
		workflow: args.workflow,
		profile: args.profile,
		ranAt: new Date().toISOString(),
		status: statusFromIssuerReport(args),
		payload: {
			kind: 'issuer-report',
			verified: args.verified,
			failingMustCount: args.failingMustCount,
			fatalError: args.fatalError
		}
	});
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

/** Assemble + validate a full verifier-report run record (stamps `ranAt` now). */
export function verifierReportRunRecord(args: {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
	verified: boolean;
	failingMustCount: number;
	attestedPassCount: number;
}): TestRunRecord {
	return TestRunRecord({
		role: args.role,
		workflow: args.workflow,
		profile: args.profile,
		ranAt: new Date().toISOString(),
		status: statusFromVerifierReport(args),
		payload: {
			kind: 'verifier-report',
			verified: args.verified,
			failingMustCount: args.failingMustCount,
			attestedPassCount: args.attestedPassCount
		}
	});
}

/** Assemble + validate a full wallet-report run record (stamps `ranAt` now). */
export function walletRunRecord(args: {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
	verified: boolean;
	failingMustCount: number;
	exchangeId?: string;
	exchangeState: 'pending' | 'active' | 'complete' | 'invalid';
}): TestRunRecord {
	return TestRunRecord({
		role: args.role,
		workflow: args.workflow,
		profile: args.profile,
		ranAt: new Date().toISOString(),
		status: statusFromWalletReport(args),
		payload: {
			kind: 'wallet-report',
			verified: args.verified,
			failingMustCount: args.failingMustCount,
			exchangeId: args.exchangeId,
			exchangeState: args.exchangeState
		}
	});
}
