import { combinationFor } from '$lib/interop/accessors.js';
import type { ChecklistRequirement } from '$lib/interop/profile-schema.js';
import {
	PassKind,
	type PassAttestation,
	type PassDefinition,
	type RejectionReason,
	type VerifierCheckOutcome,
	type VerifierRunDefinition,
	type VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';

import { PASS_KIND_LABEL, passActivity, passArtifact } from './run-reveal.js';

/** Run/attestation incoherence (surfaced as a 400 by the API routes). */
export class VerifierRunMismatchError extends Error {}

/** Acceptance checklist row each pass kind is scored onto. */
export const ACCEPTANCE_ROW_ID: Record<PassKind, string> = {
	valid: 'ob3-direct-delivery.verifier-accepts-valid-credential',
	'broken-signature': 'ob3-direct-delivery.verifier-rejects-broken-signature',
	'schema-problem': 'ob3-direct-delivery.verifier-rejects-schema-problem',
	expired: 'ob3-direct-delivery.verifier-rejects-expired'
};

/** The revoked row exists in checklist content but has no pass yet (M1). */
export const REVOKED_ROW_ID = 'ob3-direct-delivery.verifier-rejects-revoked';
export const REVOKED_DEFERRED_MESSAGE =
	'Revocation checks are not yet available in this suite — status-list support is planned.';

const EXPECTED_REASON: Record<Exclude<PassKind, 'valid'>, RejectionReason> = {
	'broken-signature': 'signature',
	'schema-problem': 'schema',
	expired: 'expiry'
};

/**
 * Score a verifier run from the operator's attestations, mirroring the
 * issuer check-runner's aggregation: `verified` iff no MUST row fails;
 * rows without a scored outcome resolve `n/a`. Throws
 * {@link VerifierRunMismatchError} when run and attestations are
 * incoherent.
 */
export function scoreVerifierRun(args: {
	run: VerifierRunDefinition;
	attestations: PassAttestation[];
}): VerifierRunnerReport {
	const { run, attestations } = args;
	const attestationByPass = validateCoherence(run, attestations);

	const outcomeByRow = new Map<string, VerifierCheckOutcome>(
		run.passes.map((pass) => {
			const outcome = scorePass(pass, attestationByPass.get(pass.passId)!);
			return [outcome.id, outcome];
		})
	);

	const combination = combinationFor('verifier', run.workflow, run.profile);
	if (!combination) {
		throw new VerifierRunMismatchError(
			`No verifier checklist exists for profile "${run.profile}" × workflow "${run.workflow}".`
		);
	}
	const { profile, checklist } = combination;

	const outcomes = checklist.steps.flatMap((step) =>
		step.requirements.map((req) => resolveRow(req, outcomeByRow))
	);
	const failingMustCount = outcomes.filter((o) => o.level === 'MUST' && o.status === 'fail').length;

	const acceptanceStepIndex = checklist.steps.findIndex((step) =>
		step.requirements.some((req) => req.id === ACCEPTANCE_ROW_ID.valid)
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
			passActivity(pass, outcomeByRow.get(ACCEPTANCE_ROW_ID[pass.kind])!, stepIndex)
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
	if (run.profile !== 'ob3-direct-delivery' || run.workflow !== 'direct-credential-verification') {
		throw new VerifierRunMismatchError(
			'Only ob3-direct-delivery × direct-credential-verification runs can be scored here.'
		);
	}
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

/** Score one pass verdict against its ground-truth kind. */
function scorePass(pass: PassDefinition, attestation: PassAttestation): VerifierCheckOutcome {
	const base = {
		id: ACCEPTANCE_ROW_ID[pass.kind],
		level: 'MUST' as const,
		source: 'attested' as const,
		attestation: {
			passLabel: pass.label,
			kind: pass.kind,
			verdict: attestation.verdict,
			...(attestation.reason !== undefined ? { reason: attestation.reason } : {})
		}
	};
	const kindLabel = PASS_KIND_LABEL[pass.kind];

	if (pass.kind === 'valid') {
		return attestation.verdict === 'accepted'
			? { ...base, status: 'pass', message: 'Your verifier accepted the valid credential.' }
			: { ...base, status: 'fail', message: 'Your verifier rejected a valid credential.' };
	}

	if (attestation.verdict === 'accepted') {
		return { ...base, status: 'fail', message: `Your verifier accepted a ${kindLabel}.` };
	}

	const expected = EXPECTED_REASON[pass.kind];
	const { reason } = attestation;
	// `other` counts as absent: rejection stands, no reason to second-guess.
	if (reason !== undefined && reason !== 'other' && reason !== expected) {
		return {
			...base,
			status: 'warn',
			message: `Your verifier rejected the ${kindLabel}, but reported reason "${reason}" — expected "${expected}".`
		};
	}
	const reasonNote = reason === expected ? ` for the expected reason ("${expected}")` : '';
	return {
		...base,
		status: 'pass',
		message: `Your verifier rejected the ${kindLabel}${reasonNote}.`
	};
}

/** Resolve one checklist row: scored, deferred-revoked, or n/a. */
function resolveRow(
	req: ChecklistRequirement,
	outcomeByRow: Map<string, VerifierCheckOutcome>
): VerifierCheckOutcome {
	const scored = req.id ? outcomeByRow.get(req.id) : undefined;
	if (scored) return scored;
	if (req.id === REVOKED_ROW_ID) {
		return {
			id: req.id,
			level: req.level,
			status: 'n/a',
			source: 'automated',
			message: REVOKED_DEFERRED_MESSAGE
		};
	}
	return {
		id: req.id ?? `unkeyed:${req.text.slice(0, 60)}`,
		level: req.level,
		status: 'n/a',
		source: 'automated',
		message: 'No automated check registered for this requirement yet.'
	};
}
