import { describe, expect, it } from 'vitest';

import {
	statusesFromOutcomes,
	statusesFromStepStates,
	statusesFromVerifierOutcomes
} from '$lib/components/interop/requirement-status-row/index.js';
import { combinationFor } from '$lib/interop/accessors.js';
import type { RoleSlug, WorkflowSlug, ProfileSlug } from '$lib/interop/profile-schema.js';
import {
	combinedRequirements,
	isRunOutdated,
	runChecklistFingerprint,
	testRunRecord,
	type FingerprintRequirement
} from '$lib/interop/run-history/index.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

/**
 * Record-time composition guard for the migrated runnable pages (P4a). Each page
 * builds its `statuses` map from the combined checklist keyed by requirement id
 * (`combinedRequirements`) and records a v2 `TestRunRecord`. These assertions lock
 * in that a completed run over the REAL P1 checklists yields a non-empty, id-keyed
 * `statuses` map with no scored requirement falling through to `pending` — i.e. the
 * runner's outcome ids line up with the checklist requirement ids.
 */

// The issuer/wallet check-runner emits an outcome for every requirement, keyed by
// its id. Simulate an all-pass completed run.
function passOutcomes(reqs: FingerprintRequirement[]): Record<string, CheckOutcome> {
	return Object.fromEntries(
		reqs.map((r) => [
			r.id,
			{ id: r.id, level: r.level as CheckOutcome['level'], status: 'pass', message: 'ok' }
		])
	);
}

function passVerifierOutcomes(
	reqs: FingerprintRequirement[]
): Record<string, VerifierCheckOutcome> {
	return Object.fromEntries(
		reqs.map((r) => [
			r.id,
			{
				id: r.id,
				level: r.level as VerifierCheckOutcome['level'],
				status: 'pass',
				message: 'ok',
				source: 'automated'
			}
		])
	);
}

const ISSUER: [RoleSlug, WorkflowSlug, ProfileSlug][] = [
	['issuer', 'credential-issuance', 'vcalm'],
	['issuer', 'credential-issuance', 'oid4'],
	['issuer', 'direct-credential-issuance', 'ob3-direct-delivery']
];

const VERIFIER: [RoleSlug, WorkflowSlug, ProfileSlug][] = [
	['verifier', 'credential-request-and-verification', 'vcalm'],
	['verifier', 'credential-request-and-verification', 'oid4'],
	['verifier', 'direct-credential-verification', 'ob3-direct-delivery']
];

describe('P4a record-time composition', () => {
	it.each(ISSUER)(
		'issuer %s/%s/%s records a v2 record with non-empty id-keyed statuses',
		(role, workflow, profile) => {
			const reqs = combinedRequirements(role, workflow, profile);
			expect(reqs.length).toBeGreaterThan(0);
			const statuses = statusesFromOutcomes(reqs, passOutcomes(reqs));
			const record = testRunRecord({
				role,
				workflow,
				profile,
				status: 'passed',
				checklistFingerprint: runChecklistFingerprint(reqs),
				statuses
			});
			expect(Object.keys(record.statuses)).toEqual(reqs.map((r) => r.id));
			expect(Object.values(record.statuses).every((s) => s.tone !== 'pending')).toBe(true);
			expect(isRunOutdated(record, reqs)).toBe(false);
		}
	);

	it.each(VERIFIER)(
		'verifier %s/%s/%s records a v2 record with non-empty id-keyed statuses',
		(role, workflow, profile) => {
			const reqs = combinedRequirements(role, workflow, profile);
			expect(reqs.length).toBeGreaterThan(0);
			const statuses = statusesFromVerifierOutcomes(reqs, passVerifierOutcomes(reqs));
			const record = testRunRecord({
				role,
				workflow,
				profile,
				status: 'passed',
				checklistFingerprint: runChecklistFingerprint(reqs),
				statuses
			});
			expect(Object.keys(record.statuses)).toEqual(reqs.map((r) => r.id));
			expect(Object.values(record.statuses).every((s) => s.tone !== 'pending')).toBe(true);
			expect(isRunOutdated(record, reqs)).toBe(false);
		}
	);

	// Tier B honest ceiling: wallet-acceptance observes progress at the step level and
	// scores the base checklist steps only. Its `statuses` map covers every base-step
	// requirement id; the fingerprint still covers the full combined set (base + additives),
	// so a later additive change correctly marks the run outdated.
	it('wallet-acceptance records step-level statuses over the base checklist', () => {
		const [role, workflow, profile]: [RoleSlug, WorkflowSlug, ProfileSlug] = [
			'wallet',
			'credential-acceptance',
			'vcalm'
		];
		const reqs = combinedRequirements(role, workflow, profile);
		const steps = combinationFor(role, workflow, profile)!.checklist.steps;
		const baseIds = [...new Set(steps.flatMap((s) => s.requirements.map((r) => r.id)))];
		expect(baseIds.length).toBeGreaterThan(0);
		const statuses = statusesFromStepStates(
			steps,
			steps.map(() => 'complete')
		);
		const record = testRunRecord({
			role,
			workflow,
			profile,
			status: 'passed',
			checklistFingerprint: runChecklistFingerprint(reqs),
			statuses
		});
		expect(Object.keys(record.statuses).sort()).toEqual(baseIds.sort());
		expect(Object.values(record.statuses).every((s) => s.tone === 'pass')).toBe(true);
		expect(isRunOutdated(record, reqs)).toBe(false);
	});

	// Tier A: wallet-presentation scores the settled exchange per requirement, so its
	// `statuses` map carries the individual outcome for each id — NOT the uniform step-level
	// painting the other observed-wallet flow uses. A run where one requirement fails and the
	// rest pass must therefore yield a mixed (non-uniform) statuses map.
	it.each([
		['wallet', 'credential-presentation', 'vcalm'],
		['wallet', 'credential-presentation', 'oid4']
	] satisfies [RoleSlug, WorkflowSlug, ProfileSlug][])(
		'wallet-presentation %s/%s/%s records per-requirement (non-uniform) statuses',
		(role, workflow, profile) => {
			const reqs = combinedRequirements(role, workflow, profile);
			expect(reqs.length).toBeGreaterThan(1);
			// First requirement fails, the rest pass — a genuinely per-requirement result.
			const outcomes: Record<string, CheckOutcome> = Object.fromEntries(
				reqs.map((r, i) => [
					r.id,
					{
						id: r.id,
						level: r.level as CheckOutcome['level'],
						status: i === 0 ? 'fail' : 'pass',
						message: i === 0 ? 'boom' : 'ok'
					}
				])
			);
			const statuses = statusesFromOutcomes(reqs, outcomes);
			const record = testRunRecord({
				role,
				workflow,
				profile,
				status: 'failed',
				checklistFingerprint: runChecklistFingerprint(reqs),
				statuses
			});
			expect(Object.keys(record.statuses)).toEqual(reqs.map((r) => r.id));
			expect(record.statuses[reqs[0].id].tone).toBe('fail');
			expect(record.statuses[reqs[1].id].tone).toBe('pass');
			// The whole point of Tier A: rows do not share one uniform status.
			expect(new Set(Object.values(record.statuses).map((s) => s.tone)).size).toBeGreaterThan(1);
			expect(isRunOutdated(record, reqs)).toBe(false);
		}
	);
});
