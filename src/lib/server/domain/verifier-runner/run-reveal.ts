import type {
	PassDefinition,
	PassKind,
	VerifierCheckOutcome
} from '$lib/interop/verifier-run/index.js';
import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';
import { credentialArtifact } from '$lib/server/domain/wallet-runner/index.js';

/** Human label for each pass kind, used in scored-outcome messages once the reveal happens. */
export const PASS_KIND_LABEL: Record<PassKind, string> = {
	valid: 'valid credential',
	'broken-signature': 'credential with a broken signature',
	'schema-problem': 'credential with a schema problem',
	expired: 'expired credential'
};

/**
 * Short reveal descriptor per pass kind, combined with the opaque credential
 * label in titles ("Credential 3 — expired") without repeating "credential".
 */
export const PASS_KIND_REVEAL: Record<PassKind, string> = {
	valid: 'valid',
	'broken-signature': 'broken signature',
	'schema-problem': 'schema problem',
	expired: 'expired'
};

/**
 * Whether the suite's own crypto verification would succeed on the pass
 * credential today (proof-level ground truth surfaced on the artifact:
 * the schema-problem proof verifies; expired fails on its date window;
 * broken-signature fails outright).
 */
const PASS_KIND_VERIFIES: Record<PassKind, boolean> = {
	valid: true,
	'schema-problem': true,
	expired: false,
	'broken-signature': false
};

const OUTCOME_ACTIVITY_STATUS = {
	pass: 'ok',
	warn: 'warn',
	fail: 'fail',
	'n/a': 'skipped'
} as const;

/**
 * The post-scoring reveal entry for one pass: a `check` activity naming
 * the pass label, the now-revealed kind, and the scored outcome (the
 * outcome message carries the operator's verdict).
 */
export function passActivity(
	pass: PassDefinition,
	outcome: VerifierCheckOutcome,
	stepIndex?: number
): WalletActivity {
	return {
		id: `verifier-pass.${pass.passId}`,
		kind: 'check',
		label: `${pass.label} — ${PASS_KIND_REVEAL[pass.kind]}`,
		status: OUTCOME_ACTIVITY_STATUS[outcome.status],
		detail: outcome.message,
		...(stepIndex !== undefined ? { stepIndex } : {})
	};
}

/** The revealed pass credential as a wallet artifact, titled by its kind. */
export function passArtifact(pass: PassDefinition): WalletArtifact {
	const base = credentialArtifact(pass.credential, { verified: PASS_KIND_VERIFIES[pass.kind] });
	return {
		kind: 'credential',
		verified: PASS_KIND_VERIFIES[pass.kind],
		...(base ? { issuer: base.issuer, issuanceDate: base.issuanceDate, types: base.types } : {}),
		title: `${pass.label} — ${PASS_KIND_REVEAL[pass.kind]}`
	};
}
