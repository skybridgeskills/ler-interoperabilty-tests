import type { ChecklistRequirement } from '$lib/interop/profile-schema.js';
import type {
	PassAttestation,
	PassDefinition,
	PassKind,
	RejectionReason,
	VerifierCheckOutcome
} from '$lib/interop/verifier-run/index.js';

import { REVOKED_DEFERRED_MESSAGE, type VerifierRowIds } from './row-registry.js';
import { PASS_KIND_LABEL } from './run-reveal.js';

const EXPECTED_REASON: Record<Exclude<PassKind, 'valid'>, RejectionReason> = {
	'broken-signature': 'signature',
	'schema-problem': 'schema',
	expired: 'expiry'
};

/** Score one pass verdict against its ground-truth kind. */
export function scorePass(
	pass: PassDefinition,
	attestation: PassAttestation,
	rowIds: VerifierRowIds
): VerifierCheckOutcome {
	const base = {
		id: rowIds.acceptance[pass.kind],
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

/**
 * Resolve one checklist row against the merged outcome sources, in
 * precedence order: scored attested outcome → pre-computed automated
 * outcome → deferred revoked → n/a.
 */
export function resolveRow(
	req: ChecklistRequirement,
	sources: {
		attested: Map<string, VerifierCheckOutcome>;
		automated: Map<string, VerifierCheckOutcome>;
		rowIds: VerifierRowIds;
	}
): VerifierCheckOutcome {
	const resolved = req.id
		? (sources.attested.get(req.id) ?? sources.automated.get(req.id))
		: undefined;
	if (resolved) return resolved;
	if (req.id === sources.rowIds.revoked) {
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
