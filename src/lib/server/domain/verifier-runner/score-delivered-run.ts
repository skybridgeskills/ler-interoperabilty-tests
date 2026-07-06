import {
	type PassAttestation,
	type PassDefinition,
	type PresentEvidence,
	type VerifierCheckOutcome,
	type VerifierRunDefinition,
	type VerifierRunnerReport,
	type VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';

import { scoreVerifierRun, VerifierRunMismatchError } from './score-run.js';

/**
 * How the VALID pass's delivery scores its checklist row. Live-delivery
 * verifier flows (OID4VP, VCALM) differ only in which row the successful
 * submission lights and the wording — everything else about scoring a
 * credential-less plan + per-credential present evidence is shared.
 */
export type DeliveryScoring = {
	/** The MUST row the valid credential's successful submission scores. */
	rowId: string;
	/** Message when the valid credential was delivered. */
	acceptedMessage: string;
	/** Message when it was not (optionally carrying the transport error). */
	rejectedMessage: (error?: string) => string;
};

/**
 * Score a live-delivery verifier run from the client-round-tripped plan,
 * per-credential present evidence, operator attestations, and the automated
 * floor outcomes. The only transport result that scores is the VALID
 * credential's delivery — it sets `delivery.rowId`; defect deliveries are
 * activity only. Reveal artifacts come from `evidence[].credential` (the plan
 * is credential-less). Throws {@link VerifierRunMismatchError} when evidence
 * and the plan are incoherent.
 */
export function scoreDeliveredRun(args: {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	floorOutcomes: VerifierCheckOutcome[];
	delivery: DeliveryScoring;
}): VerifierRunnerReport {
	const { plan, evidence, attestations, floorOutcomes, delivery } = args;
	const evidenceByPass = coherentEvidence(plan, evidence);

	const validEntry = plan.entries.find((entry) => entry.kind === 'valid')!;
	const deliveryOutcome = deliveryRow(evidenceByPass.get(validEntry.passId)!, delivery);

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

/** Score the delivery row from the VALID credential's delivery evidence. */
function deliveryRow(
	validEvidence: PresentEvidence,
	delivery: DeliveryScoring
): VerifierCheckOutcome {
	if (validEvidence.submitted) {
		return {
			id: delivery.rowId,
			level: 'MUST',
			status: 'pass',
			message: delivery.acceptedMessage,
			source: 'automated'
		};
	}
	return {
		id: delivery.rowId,
		level: 'MUST',
		status: 'fail',
		message: delivery.rejectedMessage(validEvidence.submissionError),
		source: 'automated'
	};
}
