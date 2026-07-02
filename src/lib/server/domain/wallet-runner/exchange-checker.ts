import { additiveChecklistsForCombination, combinationFor } from '$lib/interop/accessors.js';
import type {
	ChecklistRequirement,
	ProfileSlug,
	RoleSlug,
	WorkflowChecklist,
	WorkflowSlug
} from '$lib/interop/profile-schema.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';
import type {
	ChecklistGroupRef,
	IssuerRunnerReport
} from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

import { walletCheckRegistry } from './checks/index.js';
import type { WalletCheckCtx, WalletCheckFn } from './wallet-check.js';

/** The wallet conformance report — reuses the issuer-runner report shape. */
export type WalletReport = IssuerRunnerReport;

type ChecklistInput = { groupRef: ChecklistGroupRef; checklist: WorkflowChecklist };

export type ExchangeCheckerInput = {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
	ctx: WalletCheckCtx;
};

/**
 * Walks every requirement on the (role, workflow, profile) wallet checklist plus the
 * applicable additive checklists, dispatches each to the wallet check registry, and aggregates
 * into a `WalletReport`. `verified` is `true` iff no MUST resolves to `'fail'`; unregistered
 * requirement ids resolve to `'n/a'` (same semantics as the issuer-runner check-runner).
 *
 * The registry is injectable so tests (and per-protocol milestones) can supply their own set.
 */
export function ExchangeChecker(registry: Record<string, WalletCheckFn> = walletCheckRegistry) {
	function run(input: ExchangeCheckerInput): WalletReport {
		const inputs = buildChecklistInputs(input.role, input.workflow, input.profile);
		const groups = inputs.map((entry) => ({
			checklist: entry.groupRef,
			outcomes: requirementsOf(entry.checklist).map(
				(req): CheckOutcome => evaluate(req, input.ctx, registry)
			)
		}));

		const verified = groups.every((g) =>
			g.outcomes.every((o) => o.level !== 'MUST' || o.status !== 'fail')
		);

		return { verified, groups };
	}

	return { run };
}
export type ExchangeChecker = ReturnType<typeof ExchangeChecker>;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildChecklistInputs(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): ChecklistInput[] {
	const combo = combinationFor(role, workflow, profile);
	if (!combo) {
		throw new Error(`No ${role} × ${workflow} checklist for profile ${profile}.`);
	}
	const inputs: ChecklistInput[] = [
		{
			groupRef: {
				kind: 'base',
				profileSlug: combo.profile.slug,
				profileName: combo.profile.name,
				workflow,
				role
			},
			checklist: combo.checklist
		}
	];

	for (const { additive, checklist } of additiveChecklistsForCombination(profile, role, workflow)) {
		inputs.push({
			groupRef: {
				kind: 'additive',
				profileSlug: additive.slug,
				profileName: additive.name,
				workflow,
				role
			},
			checklist
		});
	}

	return inputs;
}

function requirementsOf(checklist: WorkflowChecklist): ChecklistRequirement[] {
	return checklist.steps.flatMap((s) => s.requirements);
}

function evaluate(
	req: ChecklistRequirement,
	ctx: WalletCheckCtx,
	registry: Record<string, WalletCheckFn>
): CheckOutcome {
	const fn = req.id ? registry[req.id] : undefined;
	if (!fn) {
		return {
			id: req.id ?? `unkeyed:${req.text.slice(0, 60)}`,
			level: req.level,
			status: 'n/a',
			message: 'No automated wallet check registered for this requirement yet.'
		};
	}
	const { status, message } = fn(ctx);
	return { id: req.id!, level: req.level, status, message };
}
