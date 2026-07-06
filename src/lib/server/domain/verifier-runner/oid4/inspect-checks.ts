import { combinationFor } from '$lib/interop/accessors.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { WalletActivity, WalletActivityStatus } from '$lib/interop/wallet-activity.js';
import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';
import {
	resolveAuthorizationRequest,
	type Oid4vpAuthorizationRequest
} from '$lib/server/domain/wallet-client/oid4vp/index.js';

/** The oid4 checklist rows the automated request floor writes (all MUST rows). */
export const OID4_FLOOR_ROW_IDS = {
	requestEndpoint: 'oid4.verifier-request-endpoint',
	requestMatchable: 'oid4.verifier-request-matchable',
	requestDiVpFormat: 'oid4.verifier-request-di-vp-format',
	requestTls: 'oid4.verifier-request-tls',
	responseTls: 'oid4.verifier-response-tls'
} as const;

/** Build one automated floor outcome (every floor row is a MUST). */
export function floorOutcome(
	id: string,
	status: VerifierCheckOutcome['status'],
	message: string
): VerifierCheckOutcome {
	return { id, level: 'MUST', status, message, source: 'automated' };
}

/** `n/a` outcomes for the floor rows that were not reached (intake failed — no cascading fails). */
export function notCheckedOutcomes(ids: string[], note: string): VerifierCheckOutcome[] {
	return ids.map((id) => floorOutcome(id, 'n/a', note));
}

const OUTCOME_ACTIVITY_STATUS: Record<VerifierCheckOutcome['status'], WalletActivityStatus> = {
	pass: 'ok',
	warn: 'warn',
	fail: 'fail',
	'n/a': 'skipped'
};

/** Narrate one floor outcome as a `check` activity entry. */
export function checkActivity(
	outcome: VerifierCheckOutcome,
	label: string,
	stepIndex?: number
): WalletActivity {
	return {
		id: `oid4-inspect.${outcome.id}`,
		kind: 'check',
		label,
		status: OUTCOME_ACTIVITY_STATUS[outcome.status],
		detail: outcome.message,
		...(stepIndex !== undefined ? { stepIndex } : {})
	};
}

/** A protocol-interaction activity entry (intake / fetch / nonce narration). */
export function interactionActivity(
	slug: string,
	label: string,
	status: WalletActivityStatus,
	detail?: string,
	stepIndex?: number
): WalletActivity {
	return {
		id: `oid4-inspect.${slug}`,
		kind: 'interaction',
		label,
		status,
		...(detail !== undefined ? { detail } : {}),
		...(stepIndex !== undefined ? { stepIndex } : {})
	};
}

const DI_VP_FORMAT_KEYS = ['ldp_vp', 'di_vp'];

/**
 * Check whether the request pins a Data Integrity VP format, looking at the
 * presentation definition's top-level `format` registry and every input
 * descriptor's `format`: a `ldp_vp`/`di_vp` key anywhere counts; declared
 * formats that are all JWT-family fail; anything else is a warn.
 */
export function diVpFormatCheck(request: Oid4vpAuthorizationRequest): VerifierCheckOutcome {
	const id = OID4_FLOOR_ROW_IDS.requestDiVpFormat;
	const definition = request.presentation_definition;
	const keys = [
		...Object.keys(definition.format ?? {}),
		...definition.input_descriptors.flatMap((d) => Object.keys(d.format ?? {}))
	];
	const diKey = keys.find((k) => DI_VP_FORMAT_KEYS.includes(k));
	if (diKey) {
		return floorOutcome(id, 'pass', `The request pins a Data Integrity VP format (\`${diKey}\`).`);
	}
	if (keys.length === 0) {
		return floorOutcome(id, 'warn', 'The request does not pin a Data Integrity VP format.');
	}
	if (keys.every((k) => /^jwt/i.test(k))) {
		return floorOutcome(
			id,
			'fail',
			`The request only accepts JWT formats (${keys.join(', ')}) — a Data Integrity VP (\`ldp_vp\`/\`di_vp\`) is required.`
		);
	}
	return floorOutcome(
		id,
		'warn',
		`The request declares formats (${keys.join(', ')}) but does not pin a Data Integrity VP format.`
	);
}

/** Score one TLS probe result onto a floor row for the probed endpoint. */
export function tlsOutcome(
	id: string,
	endpointLabel: string,
	probe: TlsProbeResult
): VerifierCheckOutcome {
	if (probe.atLeastTls12) {
		return floorOutcome(id, 'pass', `The ${endpointLabel} negotiated ${probe.protocol}.`);
	}
	const detail =
		probe.error ??
		(probe.protocol
			? `it negotiated ${probe.protocol}, below TLS 1.2`
			: 'the TLS version could not be determined');
	return floorOutcome(id, 'fail', `The ${endpointLabel} did not meet TLS 1.2: ${detail}`);
}

/** Step index (for activity cross-highlighting) of the oid4 checklist row carrying `rowId`. */
export function stepIndexOf(rowId: string): number | undefined {
	const combination = combinationFor('verifier', 'credential-request-and-verification', 'oid4');
	const index = combination?.checklist.steps.findIndex((step) =>
		step.requirements.some((req) => req.id === rowId)
	);
	return index !== undefined && index >= 0 ? index : undefined;
}

/**
 * Fetch a by-reference request a second time and downgrade the endpoint row
 * to `warn` when the nonce repeats (nonces should be single-use). A failed
 * second fetch never penalizes — it is narrated as not assessed.
 */
export async function nonceFreshness(
	endpoint: VerifierCheckOutcome,
	request: Oid4vpAuthorizationRequest,
	requestUri: string,
	fetchImpl: typeof fetch,
	activity: WalletActivity[],
	stepIndex?: number
): Promise<VerifierCheckOutcome> {
	const note = (status: WalletActivityStatus, detail: string) =>
		activity.push(
			interactionActivity('nonce-freshness', 'Nonce freshness', status, detail, stepIndex)
		);
	try {
		const second = (await resolveAuthorizationRequest({ requestUri }, fetchImpl)) as Record<
			string,
			unknown
		> | null;
		if (second?.nonce === request.nonce) {
			const warned = floorOutcome(
				endpoint.id,
				'warn',
				'The request endpoint returned the same nonce twice — nonces should be single-use.'
			);
			note('warn', warned.message);
			return warned;
		}
		note('ok', 'A second fetch returned a fresh nonce.');
		return endpoint;
	} catch (e) {
		note(
			'info',
			`The second fetch to compare nonces did not complete (${e instanceof Error ? e.message : String(e)}); freshness was not assessed.`
		);
		return endpoint;
	}
}

/** Compact, human-readable summary of the first few zod issues for a failed request parse. */
export function summarizeIssues(issues: { path: PropertyKey[]; message: string }[]): string {
	return issues
		.slice(0, 3)
		.map((issue) =>
			issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message
		)
		.join('; ');
}
