import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import {
	type CannotServe,
	membershipsOfProfile,
	oneOfGroupOf,
	type Scenario
} from '$lib/interop/scenarios/index.js';

/** One thing a profile requires. A `oneOf` group is **one** obligation, not N. */
export type Obligation =
	| { kind: 'scenario'; scenario: Scenario; requirementIds: string[] }
	| { kind: 'oneOf'; group: string; members: Scenario[]; requirementIds: string[] };

/** How far along one obligation is, in requirements. */
export type ObligationProgress = {
	obligation: Obligation;
	met: number;
	total: number;
	/** Set when the deployment cannot serve this obligation. Does NOT shrink `total`. */
	blocked?: CannotServe;
};

/** A completion set's standing: the base meter, and the optional work beside it. */
export type CompletionResult = {
	/** The base meter — `required` and `oneOf` memberships only. */
	met: number;
	total: number;
	obligations: ObligationProgress[];
	/** `optional` memberships, with their own meter. Never folded into the base. */
	optional: { met: number; total: number; obligations: ObligationProgress[] };
};

/**
 * Evaluate one `(profile, role)` completion set — the unit the meter renders and
 * the badge is claimed against.
 *
 * Five rules govern this, and the widget lies if any of them is recomputed
 * elsewhere:
 *
 * 1. **The unit is the requirement, not the scenario.** A row reads
 *    `4/5 requirements met`, so the meter's arithmetic visibly adds up from its
 *    own rows — and a scenario with four passes and one failing SHOULD is not
 *    flattened into a bare ✗.
 * 2. **A `oneOf` group is one obligation.** Its members declare identical
 *    requirement ids (catalog validation enforces it), so the group contributes
 *    that id set **once**, and stops gating as soon as one member passes.
 * 3. **`optional` memberships are excluded from the base meter entirely.**
 *    Including them would mean it can never fill.
 * 4. **A blocked obligation does not shrink the denominator.** Its requirements
 *    stay in `total` and the badge is blocked, because a shrinking denominator
 *    would let two deployments issue badges that look identical and mean
 *    different things.
 * 5. **A requirement counts as met only when its outcome is `pass`.** A failing
 *    SHOULD is therefore not met here even though it does not fail its
 *    scenario — the two numbers answer different questions, and both come from
 *    the same outcome map.
 */
export function evaluateCompletion(args: {
	profile: ProfileSlug | AdditiveProfileSlug;
	role: RoleSlug;
	/** Persisted runs, keyed by scenario slug. Drift-dropped before it gets here. */
	runs: Record<string, ScenarioRunRecord>;
	/** Scenarios this deployment cannot serve, keyed by scenario slug. */
	blocked?: Record<string, CannotServe>;
}): CompletionResult {
	const memberships = membershipsOfProfile(args.profile).filter(
		(m) => m.scenario.role === args.role
	);

	const required: Obligation[] = [];
	const optional: Obligation[] = [];
	const groups = new Map<string, Scenario[]>();

	for (const { scenario, level } of memberships) {
		const group = oneOfGroupOf(level);
		if (group) {
			groups.set(group, [...(groups.get(group) ?? []), scenario]);
		} else if (level === 'optional') {
			optional.push({ kind: 'scenario', scenario, requirementIds: requirementIdsOf(scenario) });
		} else {
			required.push({ kind: 'scenario', scenario, requirementIds: requirementIdsOf(scenario) });
		}
	}

	for (const [group, members] of groups) {
		// Members share a requirement id set by construction, so take the first.
		required.push({ kind: 'oneOf', group, members, requirementIds: requirementIdsOf(members[0]) });
	}

	const base = required.map((o) => progressFor(o, args.runs, args.blocked));
	const extra = optional.map((o) => progressFor(o, args.runs, args.blocked));

	return {
		...totalsOf(base),
		obligations: base,
		optional: { ...totalsOf(extra), obligations: extra }
	};
}

/** How many of one obligation's requirements are met, and how many there are. */
function progressFor(
	obligation: Obligation,
	runs: Record<string, ScenarioRunRecord>,
	blocked?: Record<string, CannotServe>
): ObligationProgress {
	const total = obligation.requirementIds.length;

	if (obligation.kind === 'scenario') {
		const reason = blocked?.[obligation.scenario.slug];
		return {
			obligation,
			// A blocked obligation is worth nothing and still costs its full total.
			met: reason ? 0 : metCount(obligation.requirementIds, runs[obligation.scenario.slug]),
			total,
			...(reason ? { blocked: reason } : {})
		};
	}

	// A group is satisfied by its best member: one passing alternative is enough,
	// and a partly-run alternative still shows partial credit.
	const unblocked = obligation.members.filter((m) => !blocked?.[m.slug]);
	const met = unblocked.reduce(
		(best, member) => Math.max(best, metCount(obligation.requirementIds, runs[member.slug])),
		0
	);
	const everyMemberBlocked = unblocked.length === 0;
	const reason = everyMemberBlocked ? blocked?.[obligation.members[0].slug] : undefined;

	return { obligation, met, total, ...(reason ? { blocked: reason } : {}) };
}

/** Requirements in this set whose stored outcome is a pass. */
function metCount(requirementIds: string[], run: ScenarioRunRecord | undefined): number {
	if (!run) return 0;
	return requirementIds.filter((id) => run.outcomes[id]?.status === 'pass').length;
}

function totalsOf(progress: ObligationProgress[]): { met: number; total: number } {
	return {
		met: progress.reduce((sum, p) => sum + p.met, 0),
		total: progress.reduce((sum, p) => sum + p.total, 0)
	};
}

/** Every requirement id in a scenario, in step-then-requirement order. */
function requirementIdsOf(scenario: Scenario): string[] {
	return scenario.steps.flatMap((step) => step.requirements.map((r) => r.id));
}
