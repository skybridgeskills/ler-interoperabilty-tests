import type { PassArtifactView } from '$lib/components/interop/test-wallet/index.js';
import type { StepRunState } from '$lib/interop/index.js';
import type {
	PassAttestation,
	PassDefinition,
	PassVerdict,
	RejectionReason,
	VerifierCheckOutcome,
	VerifierRunDefinition,
	VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';
import type { WalletActivity } from '$lib/interop/wallet-activity.js';

/**
 * Pure helpers behind the runnable verifier direct-delivery page: wallet
 * narration, artifact views, attestation assembly, and checklist derivation.
 * CRITICAL ground-truth discipline: nothing produced here before the reveal
 * may mention a pass `kind` — pre-reveal titles/notes/labels only ever use the
 * opaque pass label and the operator's own verdict.
 */

/** Human phrasing for a rejection reason in verdict echoes and artifact notes. */
export const REASON_LABEL: Record<RejectionReason, string> = {
	signature: 'signature problem',
	schema: 'schema problem',
	expiry: 'expired',
	other: 'other'
};

/** Narration: the run started (after `generate` returns). */
export function startedActivity(run: VerifierRunDefinition): WalletActivity {
	return {
		id: 'run.started',
		kind: 'interaction',
		label: `Started verifying — ${run.passes.length} credentials in a randomized order`,
		status: 'ok'
	};
}

/** Narration: one pass prepared + handed over ("over to you"). */
export function handOffActivity(
	pass: PassDefinition,
	index: number,
	total: number
): WalletActivity[] {
	return [
		{
			id: `pass-${pass.passId}.prepared`,
			kind: 'interaction',
			label: `Prepared credential ${index + 1} of ${total}`,
			status: 'ok'
		},
		{
			id: `pass-${pass.passId}.handed`,
			kind: 'interaction',
			label: `Handed credential ${index + 1} of ${total} to your verifier — over to you`,
			status: 'info'
		}
	];
}

/** The quiet verdict line: "You reported: rejected — signature problem". */
export function verdictText(verdict: PassVerdict, reason?: RejectionReason): string {
	return `You reported: ${verdict}${reason ? ` — ${REASON_LABEL[reason]}` : ''}`;
}

/**
 * Narration: echo the operator's verdict. Deliberately `info` (neutral) — the
 * echo must not hint at correctness before the reveal.
 */
export function verdictEchoActivity(
	pass: PassDefinition,
	attestation: PassAttestation
): WalletActivity {
	return {
		id: `pass-${pass.passId}.verdict`,
		kind: 'interaction',
		label: verdictText(attestation.verdict, attestation.reason),
		status: 'info'
	};
}

/** Narration: all verdicts in, scoring is running. */
export function scoringActivity(): WalletActivity {
	return {
		id: 'run.scoring',
		kind: 'interaction',
		label: 'All verdicts recorded — scoring against ground truth…',
		status: 'info'
	};
}

/** Narration: the reveal header, right before the report's per-pass check entries. */
export function revealedActivity(): WalletActivity {
	return {
		id: 'run.revealed',
		kind: 'interaction',
		label: 'Ground truth revealed — here is how your verifier did',
		status: 'ok'
	};
}

/** Assemble one attestation; `''`/accepted collapse to "no reason given". */
export function buildAttestation(
	passId: string,
	verdict: PassVerdict,
	reason: RejectionReason | ''
): PassAttestation {
	return {
		passId,
		verdict,
		...(verdict === 'rejected' && reason !== '' ? { reason } : {})
	};
}

/** The `score` endpoint's request body (the stateless round trip). */
export function scoreRequestBody(
	run: VerifierRunDefinition,
	attestations: PassAttestation[]
): { run: VerifierRunDefinition; attestations: PassAttestation[] } {
	return { run, attestations };
}

/**
 * Artifact-list views for the handed-over passes. Pre-reveal (`report`
 * absent): opaque titles, no verified chip, note = the operator's own verdict
 * or "Awaiting your verdict". Post-reveal: relabeled from the report's
 * artifacts (revealed kind + suite verification), same copy/download payload.
 */
export function passArtifactViews(args: {
	run: VerifierRunDefinition;
	handedCount: number;
	attestations: PassAttestation[];
	report?: VerifierRunnerReport;
}): PassArtifactView[] {
	const { run, handedCount, attestations, report } = args;
	return run.passes.slice(0, handedCount).map((pass, i) => {
		const attestation = attestations[i];
		const revealed = report?.artifacts[i];
		return {
			title: revealed?.title ?? pass.label,
			json: JSON.stringify(pass.credential, null, 2),
			fileName: `${pass.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`,
			...(revealed ? { verified: revealed.verified } : {}),
			note: attestation
				? verdictText(attestation.verdict, attestation.reason)
				: 'Awaiting your verdict'
		};
	});
}

/** Index every scored outcome by requirement id (all groups). */
export function outcomesById(
	report: VerifierRunnerReport | undefined
): Record<string, VerifierCheckOutcome> {
	if (!report) return {};
	return Object.fromEntries(
		report.groups.flatMap((g) => g.outcomes).map((outcome) => [outcome.id, outcome])
	);
}

/**
 * Find the scored outcome for one checklist requirement. Id-less capability
 * rows are resolved through the scorer's `unkeyed:<text prefix>` fallback key
 * (client-side mirror of `resolveRow` in the scoring engine — kept here so no
 * `$lib/server` import leaks into the page) and therefore light up `n/a` with
 * the engine's message once the report lands.
 */
export function outcomeForRequirement(
	byId: Record<string, VerifierCheckOutcome>,
	requirement: { id?: string; text: string }
): VerifierCheckOutcome | undefined {
	return byId[requirement.id ?? `unkeyed:${requirement.text.slice(0, 60)}`];
}

/**
 * Left-column step states from scored outcomes (mirrors the issuer page's
 * derivation): any fail → failed; every requirement resolved → complete;
 * some resolved → in-flight; none → pending.
 */
export function deriveStepStates(
	steps: Array<{ requirements: Array<{ id?: string; text: string }> }>,
	byId: Record<string, VerifierCheckOutcome>
): StepRunState[] {
	return steps.map((step) => {
		const outcomes = step.requirements
			.map((r) => outcomeForRequirement(byId, r))
			.filter((o): o is VerifierCheckOutcome => !!o);
		if (outcomes.some((o) => o.status === 'fail')) return 'failed';
		if (step.requirements.length > 0 && outcomes.length === step.requirements.length)
			return 'complete';
		if (outcomes.length > 0) return 'in-flight';
		return 'pending';
	});
}
