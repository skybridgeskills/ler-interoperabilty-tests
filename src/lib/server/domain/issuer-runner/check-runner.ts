import type {
	ChecklistRequirement,
	ChecklistStep,
	WorkflowChecklist
} from '$lib/interop/profile-schema.js';

import type { CheckOutcome } from './check-outcome.js';
import { checkRegistry, type VerifierCoreResultLite } from './checks/index.js';
import type { ChecklistGroupRef, IssuerRunnerReport } from './issuer-runner-report.js';

/** A checklist + its identifying metadata, as fed into the check-runner. */
export type ChecklistInput = {
	groupRef: ChecklistGroupRef;
	checklist: WorkflowChecklist;
};

export type CheckRunnerInput = {
	credential: unknown;
	verifierResult: VerifierCoreResultLite;
	includeAdditive: boolean;
	checklists: ChecklistInput[];
};

/**
 * Orchestrator that walks every requirement on every supplied
 * checklist, dispatches to the per-requirement check registry, and
 * aggregates into a single `IssuerRunnerReport`.
 *
 * The overall `verified` flag is `true` iff no MUST requirement
 * across any group resolves to `'fail'`. A MUST that resolves to
 * `'n/a'` (because the check is not automatable from the credential
 * JSON, or because no automated check is registered) does **not**
 * flip `verified` — the runner only flags MUSTs it could actively
 * disprove. SHOULD/MAY failures are warnings that never flip
 * `verified`.
 */
export function CheckRunner() {
	function run(input: CheckRunnerInput): IssuerRunnerReport {
		const groups = input.checklists.map((entry) => ({
			checklist: entry.groupRef,
			outcomes: requirementsOf(entry.checklist).map((req): CheckOutcome => evaluate(req, input))
		}));

		const verified = groups.every((g) =>
			g.outcomes.every((o) => o.level !== 'MUST' || o.status !== 'fail')
		);

		return { verified, groups };
	}

	return { run };
}
export type CheckRunner = ReturnType<typeof CheckRunner>;

// ── helpers ──────────────────────────────────────────────────────────────────

function requirementsOf(checklist: WorkflowChecklist): ChecklistRequirement[] {
	return checklist.steps.flatMap((s: ChecklistStep) => s.requirements);
}

function evaluate(
	req: ChecklistRequirement,
	input: Omit<CheckRunnerInput, 'checklists'>
): CheckOutcome {
	const fn = req.id ? checkRegistry[req.id] : undefined;
	if (!fn) {
		return {
			id: req.id ?? `unkeyed:${req.text.slice(0, 60)}`,
			level: req.level,
			status: 'n/a',
			message: 'No automated check registered for this requirement yet.'
		};
	}
	const { status, message } = fn({
		credential: input.credential,
		verifierResult: input.verifierResult,
		includeAdditive: input.includeAdditive
	});
	return { id: req.id!, level: req.level, status, message };
}
