import { combinationFor } from '$lib/interop/accessors.js';
import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';
import type { CheckResult } from '$lib/server/domain/issuer-runner/checks/index.js';
import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';
import type { IssuerFlowObservations } from '$lib/server/domain/wallet-client/index.js';

/** The context the VCALM issuer-flow checks read: the observations accumulated by `runIssuerFlow`. */
export type IssuerFlowCheckCtx = IssuerFlowObservations;

/**
 * A VCALM issuer-flow check. Returns a {@link CheckResult} once its inputs are observed, or
 * `undefined` when the relevant step has not run yet — the runner omits `undefined` results so
 * the UI can render those requirements as *pending*.
 */
export type IssuerFlowCheckFn = (ctx: IssuerFlowCheckCtx) => CheckResult | undefined;

/**
 * Walk the base issuer × credential-issuance × `profile` checklist, dispatch each requirement by
 * `id` to the registry, and aggregate the resolved outcomes into an {@link IssuerRunnerReport}.
 * Requirements whose step has not run (or that have no registered check) are omitted (pending).
 * `verified` is `true` iff no resolved MUST outcome is `fail`.
 *
 * Generic over the check context so it serves any issuer flow (VCALM observations, OID4 issuer-flow
 * observations, …); the registry supplies the profile-specific check functions keyed by requirement
 * `id`.
 */
export function runIssuerFlowChecks<Ctx>(
	ctx: Ctx,
	opts: {
		profile: ProfileSlug;
		registry: Record<string, (ctx: Ctx) => CheckResult | undefined>;
	}
): { report: IssuerRunnerReport; outcomes: CheckOutcome[] } {
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

	const verified = outcomes.every((o) => o.level !== 'MUST' || o.status !== 'fail');

	const report: IssuerRunnerReport = {
		verified,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: combo.profile.slug,
					profileName: combo.profile.name,
					workflow: 'credential-issuance',
					role: 'issuer'
				},
				outcomes
			}
		]
	};
	return { report, outcomes };
}
