import {
	type PassAttestation,
	type PassDefinition,
	type PresentEvidence,
	type VerifierCheckOutcome,
	type VerifierRunDefinition,
	type VerifierRunnerReport,
	type VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';

import { scoreVerifierRun, VerifierRunMismatchError } from '../score-run.js';

/** The step-2 checklist row scored by the VALID credential's successful `direct_post` delivery. */
const RESPONSE_ENDPOINT_ROW_ID = 'oid4.verifier-response-endpoint';

/**
 * Score an oid4 verifier run from the client-round-tripped plan, per-credential
 * present evidence, operator attestations, and the automated floor outcomes
 * (from the inspect endpoint). The only transport result that scores is the
 * VALID credential's delivery — it sets `oid4.verifier-response-endpoint`;
 * defect deliveries are activity only. Reveal artifacts come from
 * `evidence[].credential` (the plan is credential-less). Throws
 * {@link VerifierRunMismatchError} when evidence and the plan are incoherent.
 */
export function scoreOid4Run(args: {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	floorOutcomes: VerifierCheckOutcome[];
}): VerifierRunnerReport {
	const { plan, evidence, attestations, floorOutcomes } = args;
	const evidenceByPass = coherentEvidence(plan, evidence);

	const validEntry = plan.entries.find((entry) => entry.kind === 'valid')!;
	const deliveryOutcome = deliveryRow(evidenceByPass.get(validEntry.passId)!);

	// Rebuild a VerifierRunDefinition, attaching each present credential so the
	// reveal artifacts come from what was actually delivered.
	const run: VerifierRunDefinition = {
		runId: plan.runId,
		profile: plan.profile,
		workflow: plan.workflow,
		cryptosuite: plan.cryptosuite,
		passes: plan.entries.map(
			(entry): PassDefinition => ({
				passId: entry.passId,
				label: entry.label,
				kind: entry.kind,
				credential: evidenceByPass.get(entry.passId)!.credential
			})
		)
	};

	return scoreVerifierRun({
		run,
		attestations,
		automatedOutcomes: [...floorOutcomes, deliveryOutcome]
	});
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** One evidence entry per plan entry, ids matching exactly once each. */
function coherentEvidence(
	plan: VerifierRunPlan,
	evidence: PresentEvidence[]
): Map<string, PresentEvidence> {
	const byPass = new Map<string, PresentEvidence>();
	for (const item of evidence) {
		if (!plan.entries.some((entry) => entry.passId === item.passId)) {
			throw new VerifierRunMismatchError(`Evidence references unknown pass "${item.passId}".`);
		}
		if (byPass.has(item.passId)) {
			throw new VerifierRunMismatchError(`Multiple evidence entries for pass "${item.passId}".`);
		}
		byPass.set(item.passId, item);
	}
	const missing = plan.entries.filter((entry) => !byPass.has(entry.passId));
	if (missing.length > 0) {
		throw new VerifierRunMismatchError(
			`Missing present evidence for pass "${missing[0].passId}" (${missing[0].label}).`
		);
	}
	return byPass;
}

/** Score the response-endpoint row from the VALID credential's delivery evidence. */
function deliveryRow(validEvidence: PresentEvidence): VerifierCheckOutcome {
	if (validEvidence.submitted) {
		return {
			id: RESPONSE_ENDPOINT_ROW_ID,
			level: 'MUST',
			status: 'pass',
			message: 'The verifier accepted the presentation at its response endpoint.',
			source: 'automated'
		};
	}
	const reason = validEvidence.submissionError ? ` (${validEvidence.submissionError})` : '';
	return {
		id: RESPONSE_ENDPOINT_ROW_ID,
		level: 'MUST',
		status: 'fail',
		message: `The verifier did not accept the presentation at its response endpoint${reason}.`,
		source: 'automated'
	};
}
