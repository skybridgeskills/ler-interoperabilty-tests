import type { PassArtifactView } from '$lib/components/interop/test-wallet/index.js';
import type { StepRunState } from '$lib/interop/index.js';
import type {
	PassAttestation,
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunnerReport,
	VerifierRunPlan,
	VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletActivity } from '$lib/interop/wallet-activity.js';
// Truly-identical pure helpers shared with the direct-delivery flow (verdict
// echoes, attestation assembly, checklist derivation). Reused, not forked — the
// present-time specifics below are what differ. Imported locally for use here
// and re-exported so the page has one flow module to import from.
import {
	buildAttestation,
	deriveStepStates,
	outcomeForRequirement,
	outcomesById,
	scoringActivity,
	verdictEchoActivity,
	verdictText
} from '$lib/pages/runnable-verifier-direct-delivery/verifier-pass-flow.js';

export {
	buildAttestation,
	deriveStepStates,
	outcomeForRequirement,
	outcomesById,
	scoringActivity,
	verdictEchoActivity,
	verdictText
};

/** Narration: the run started (after `plan` returns), before the first exchange is engaged. */
export function startedActivity(count: number): WalletActivity {
	return {
		id: 'run.started',
		kind: 'interaction',
		label: `Started verifying — ${count} credentials in a randomized order`,
		status: 'ok'
	};
}

/**
 * Narration: one credential was generated at present time and submitted to the
 * verifier's exchange. `submitted` false is a neutral warn note — the operator
 * still reports their verifier's decision (or re-presents against a fresh
 * exchange); it does not itself mean the credential was rejected on its merits.
 */
export function presentedActivity(
	entry: VerifierRunPlanEntry,
	index: number,
	total: number,
	submitted: boolean
): WalletActivity {
	return {
		id: `present-${entry.passId}.handed`,
		kind: 'interaction',
		label: `Presented credential ${index + 1} of ${total} to your verifier — over to you`,
		status: submitted ? 'info' : 'warn',
		...(submitted ? {} : { detail: 'The presentation was not accepted at the exchange.' })
	};
}

/** Narration: the reveal header, right before the report's per-credential entries. */
export function revealedActivity(): WalletActivity {
	return {
		id: 'run.revealed',
		kind: 'interaction',
		label: 'Ground truth revealed — here is how your verifier did',
		status: 'ok'
	};
}

/**
 * The `score` endpoint's request body: the full stateless round trip of
 * everything the client accumulated — plan, per-credential evidence,
 * attestations, and the automated floor outcomes from the first pass.
 */
export function scoreRequestBody(args: {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	floorOutcomes: VerifierCheckOutcome[];
}): {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	floorOutcomes: VerifierCheckOutcome[];
} {
	return args;
}

/**
 * Index the outcomes the checklist should reflect right now: the full scored
 * report once it lands, otherwise just the automated floor outcomes so the
 * exchange floor rows light after the first credential is presented while
 * acceptance and delivery rows stay pending until scoring.
 */
export function currentOutcomesById(
	report: VerifierRunnerReport | undefined,
	floorOutcomes: VerifierCheckOutcome[]
): Record<string, VerifierCheckOutcome> {
	if (report) return outcomesById(report);
	return Object.fromEntries(floorOutcomes.map((outcome) => [outcome.id, outcome]));
}

/**
 * Replace one credential's present evidence in place (transport-retry: a failed
 * submission is re-presented against a fresh exchange before the verdict is
 * recorded). Only the target index changes; every other credential's evidence
 * and any recorded verdicts are untouched.
 */
export function replaceEvidence(
	evidence: PresentEvidence[],
	index: number,
	next: PresentEvidence
): PresentEvidence[] {
	return evidence.map((item, i) => (i === index ? next : item));
}

/**
 * Artifact-list views for the presented credentials, built from each present
 * response's `credential`. Pre-reveal (`report` absent): opaque titles, no
 * verified chip, note = the operator's own verdict or "Awaiting your verdict".
 * Post-reveal: relabeled from the report's revealed artifacts. No pass `kind`
 * is ever rendered before the reveal.
 */
export function passArtifactViews(args: {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	report?: VerifierRunnerReport;
}): PassArtifactView[] {
	const { plan, evidence, attestations, report } = args;
	return evidence.map((item, i) => {
		const entry = plan.entries[i];
		const attestation = attestations[i];
		const revealed = report?.artifacts[i];
		return {
			title: revealed?.title ?? entry.label,
			json: JSON.stringify(item.credential, null, 2),
			fileName: `${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`,
			...(revealed ? { verified: revealed.verified } : {}),
			note: attestation
				? verdictText(attestation.verdict, attestation.reason)
				: 'Awaiting your verdict'
		};
	});
}

/** Left-column step states: from the scored report, else pending with the active step in-flight. */
export function stepStatesFor(args: {
	steps: Array<{ requirements: Array<{ id?: string; text: string }> }>;
	report: VerifierRunnerReport | undefined;
	busy: boolean;
}): StepRunState[] {
	const { steps, report, busy } = args;
	if (report) return deriveStepStates(steps, outcomesById(report));
	return steps.map((_, i) =>
		busy && i === steps.length - 1 ? 'in-flight' : ('pending' as StepRunState)
	);
}
