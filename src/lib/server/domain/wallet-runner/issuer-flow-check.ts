import { additiveChecklistsForCombination, combinationFor } from '$lib/interop/accessors.js';
import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';
import {
	checkRegistry,
	type CheckCtx,
	type CheckResult
} from '$lib/server/domain/issuer-runner/checks/index.js';
import type {
	ChecklistGroupRef,
	IssuerRunnerReport
} from '$lib/server/domain/issuer-runner/issuer-runner-report.js';
import type { IssuerFlowObservations } from '$lib/server/domain/wallet-client/index.js';

/** The context the VCALM issuer-flow checks read: the observations accumulated by `runIssuerFlow`. */
export type IssuerFlowCheckCtx = IssuerFlowObservations;

/**
 * A VCALM issuer-flow check. Returns a {@link CheckResult} once its inputs are observed, or
 * `undefined` when the relevant step has not run yet — the runner omits `undefined` results so
 * the UI can render those requirements as *pending*.
 */
export type IssuerFlowCheckFn = (ctx: IssuerFlowCheckCtx) => CheckResult | undefined;

/** A checklist group plus its resolved outcomes, as returned in the report. */
type Group = { checklist: ChecklistGroupRef; outcomes: CheckOutcome[] };

/**
 * Walk the base issuer × credential-issuance × `profile` checklist, dispatch each requirement by
 * `id` to the registry, and aggregate the resolved outcomes into an {@link IssuerRunnerReport}.
 * Requirements whose step has not run (or that have no registered check) are omitted (pending).
 *
 * When `additiveProfiles` + `toCredentialCtx` are supplied, each selected additive that declares an
 * issuer × credential-issuance checklist is additionally evaluated against the exchange-delivered
 * credential and emitted as its own `kind: 'additive'` group — reusing the shared issuer-runner
 * `checkRegistry` so the exchange flows reach parity with the paste runner (see ADR
 * `2026-07-03-additive-execution-in-exchange-flows.md`). `verified` is `true` iff no resolved MUST
 * outcome across **all** groups (base + additive) is `fail`.
 *
 * Generic over the check context so it serves any issuer flow (VCALM observations, OID4 issuer-flow
 * observations, …); the registry supplies the profile-specific check functions keyed by requirement
 * `id`, and `toCredentialCtx` adapts the flow observations into the credential {@link CheckCtx} the
 * additive checks read.
 */
export function runIssuerFlowChecks<Ctx>(
	ctx: Ctx,
	opts: {
		profile: ProfileSlug;
		registry: Record<string, (ctx: Ctx) => CheckResult | undefined>;
		additiveProfiles?: AdditiveProfileSlug[];
		toCredentialCtx?: (ctx: Ctx) => CheckCtx;
	}
): { report: IssuerRunnerReport; outcomes: CheckOutcome[]; additiveOutcomes: CheckOutcome[] } {
	const { profile, registry } = opts;
	const combo = combinationFor('issuer', 'credential-issuance', profile);
	if (!combo) {
		throw new Error(`No issuer × credential-issuance × ${profile} checklist found.`);
	}

	const outcomes: CheckOutcome[] = [];
	for (const req of combo.checklist.steps.flatMap((s) => s.requirements)) {
		const fn = req.id ? registry[req.id] : undefined;
		if (!fn) continue; // unregistered → pending
		const result = fn(ctx);
		if (!result) continue; // step not run yet → pending
		outcomes.push({
			id: req.id!,
			level: req.level,
			status: result.status,
			message: result.message
		});
	}

	const baseGroup: Group = {
		checklist: {
			kind: 'base',
			profileSlug: combo.profile.slug,
			profileName: combo.profile.name,
			workflow: 'credential-issuance',
			role: 'issuer'
		},
		outcomes
	};

	const additiveGroups = evaluateAdditiveGroups(ctx, {
		profile,
		additiveProfiles: opts.additiveProfiles,
		toCredentialCtx: opts.toCredentialCtx
	});
	const additiveOutcomes = additiveGroups.flatMap((g) => g.outcomes);

	const groups = [baseGroup, ...additiveGroups];
	const verified = groups.every((g) =>
		g.outcomes.every((o) => o.level !== 'MUST' || o.status !== 'fail')
	);

	return { report: { verified, groups }, outcomes, additiveOutcomes };
}

/**
 * Evaluate each selected additive's issuer × credential-issuance checklist against the
 * exchange-delivered credential. Returns one `additive` group per selected additive. Skips
 * evaluation entirely when no credential has been delivered yet — the additive's requirements then
 * stay pending, matching the base flow's step-not-run convention.
 */
function evaluateAdditiveGroups<Ctx>(
	ctx: Ctx,
	opts: {
		profile: ProfileSlug;
		additiveProfiles?: AdditiveProfileSlug[];
		toCredentialCtx?: (ctx: Ctx) => CheckCtx;
	}
): Group[] {
	const selected = new Set(opts.additiveProfiles ?? []);
	if (selected.size === 0 || !opts.toCredentialCtx) return [];

	// Force the additive gate on (see CheckCtx.includeAdditive): the group is only built for a
	// specifically-selected additive, so gating is redundant here but kept for the OSA checks.
	const credCtx: CheckCtx = { ...opts.toCredentialCtx(ctx), includeAdditive: true };
	if (credCtx.credential === undefined) return []; // no credential yet → pending

	const groups: Group[] = [];
	for (const { additive, checklist } of additiveChecklistsForCombination(
		opts.profile,
		'issuer',
		'credential-issuance'
	)) {
		if (!selected.has(additive.slug)) continue;
		const outcomes: CheckOutcome[] = [];
		for (const req of checklist.steps.flatMap((s) => s.requirements)) {
			const fn = req.id ? checkRegistry[req.id] : undefined;
			if (!fn) continue; // unregistered → pending
			const { status, message } = fn(credCtx);
			outcomes.push({ id: req.id!, level: req.level, status, message });
		}
		groups.push({
			checklist: {
				kind: 'additive',
				profileSlug: additive.slug,
				profileName: additive.name,
				workflow: 'credential-issuance',
				role: 'issuer'
			},
			outcomes
		});
	}
	return groups;
}
