import { combinationFor } from '$lib/interop/accessors.js';
import {
	PassKind,
	type PassAttestation,
	type VerifierCheckOutcome,
	type VerifierRunDefinition,
	type VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';

import { resolveRow, scorePass } from './resolve-rows.js';
import { verifierRowIdsFor } from './row-registry.js';
import { passActivity, passArtifact } from './run-reveal.js';

// M1 compat: these constants moved to the row registry.
export { ACCEPTANCE_ROW_ID, REVOKED_DEFERRED_MESSAGE, REVOKED_ROW_ID } from './row-registry.js';

/** Run/attestation incoherence (surfaced as a 400 by the API routes). */
export class VerifierRunMismatchError extends Error {}

/**
 * Score a verifier run from the operator's attestations, mirroring the
 * issuer check-runner's aggregation: `verified` iff no MUST row fails;
 * rows without a merged outcome resolve `n/a`. Optional
 * `automatedOutcomes` are pre-computed floor outcomes (e.g. OID4VP
 * request checks) merged into the checklist with attested outcomes
 * taking precedence per row; they add no reveal activity of their own.
 * Passes may omit `credential` (live-delivery protocols generate the
 * fixture at present time) — artifacts then carry the reveal title only.
 * Throws {@link VerifierRunMismatchError} when run and attestations are
 * incoherent or the (profile, workflow) pair is not scorable.
 */
export function scoreVerifierRun(args: {
	run: VerifierRunDefinition;
	attestations: PassAttestation[];
	automatedOutcomes?: VerifierCheckOutcome[];
}): VerifierRunnerReport {
	const { run, attestations, automatedOutcomes = [] } = args;
	const rowIds = verifierRowIdsFor(run.profile, run.workflow);
	const combination = combinationFor('verifier', run.workflow, run.profile);
	if (!rowIds || !combination) {
		throw new VerifierRunMismatchError(
			`No scorable verifier checklist exists for profile "${run.profile}" × workflow "${run.workflow}".`
		);
	}
	const attestationByPass = validateCoherence(run, attestations);

	const attested = new Map<string, VerifierCheckOutcome>(
		run.passes.map((pass) => {
			const outcome = scorePass(pass, attestationByPass.get(pass.passId)!, rowIds);
			return [outcome.id, outcome];
		})
	);
	const automated = new Map<string, VerifierCheckOutcome>(
		automatedOutcomes.map((outcome) => [outcome.id, outcome])
	);

	const { profile, checklist } = combination;

	const outcomes = checklist.steps.flatMap((step) =>
		step.requirements.map((req) => resolveRow(req, { attested, automated, rowIds }))
	);
	const failingMustCount = outcomes.filter((o) => o.level === 'MUST' && o.status === 'fail').length;

	const acceptanceStepIndex = checklist.steps.findIndex((step) =>
		step.requirements.some((req) => req.id === rowIds.acceptance.valid)
	);
	const stepIndex = acceptanceStepIndex >= 0 ? acceptanceStepIndex : undefined;

	return {
		verified: failingMustCount === 0,
		failingMustCount,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: profile.slug,
					profileName: profile.name,
					workflow: run.workflow,
					role: 'verifier'
				},
				outcomes
			}
		],
		activity: run.passes.map((pass) =>
			passActivity(pass, attested.get(rowIds.acceptance[pass.kind])!, stepIndex)
		),
		artifacts: run.passes.map((pass) => passArtifact(pass))
	};
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** One attestation per pass, ids matching, each pass kind exactly once. */
function validateCoherence(
	run: VerifierRunDefinition,
	attestations: PassAttestation[]
): Map<string, PassAttestation> {
	const kinds = run.passes.map((p) => p.kind);
	const expectedKinds = PassKind.schema.options;
	const eachKindOnce =
		kinds.length === expectedKinds.length && expectedKinds.every((k) => kinds.includes(k));
	if (!eachKindOnce) {
		throw new VerifierRunMismatchError('Run must contain each pass kind exactly once.');
	}
	if (new Set(run.passes.map((p) => p.passId)).size !== run.passes.length) {
		throw new VerifierRunMismatchError('Run pass ids must be unique.');
	}

	const byPass = new Map<string, PassAttestation>();
	for (const attestation of attestations) {
		if (!run.passes.some((p) => p.passId === attestation.passId)) {
			throw new VerifierRunMismatchError(
				`Attestation references unknown pass "${attestation.passId}".`
			);
		}
		if (byPass.has(attestation.passId)) {
			throw new VerifierRunMismatchError(`Multiple attestations for pass "${attestation.passId}".`);
		}
		byPass.set(attestation.passId, attestation);
	}
	const missing = run.passes.filter((p) => !byPass.has(p.passId));
	if (missing.length > 0) {
		throw new VerifierRunMismatchError(
			`Missing attestation for pass "${missing[0].passId}" (${missing[0].label}).`
		);
	}
	return byPass;
}
