import { combinationFor } from '$lib/interop/accessors.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { WalletActivity, WalletActivityStatus } from '$lib/interop/wallet-activity.js';
import type { VcalmVerifierFlowResult } from '$lib/server/domain/wallet-client/drivers/vcalm-verifier-flow.js';
import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';

/** The vcalm checklist rows the automated floor writes (all MUST rows). */
export const VCALM_FLOOR_ROW_IDS = {
	interactionEndpoint: 'vcalm.verifier-interaction-endpoint',
	vprQuery: 'vcalm.verifier-vpr-query',
	vprDidAuth: 'vcalm.verifier-vpr-didauth',
	requestTls: 'vcalm.verifier-request-tls',
	responseTls: 'vcalm.verifier-response-tls'
} as const;

/**
 * The automated vcalm floor over one exchange engagement. Derived from a single
 * {@link VcalmVerifierFlowResult} (each VC-API exchange is single-use, so the
 * floor is a byproduct of presenting the first credential). Intake failure — the
 * interaction URL not resolving a `vcapi` endpoint — fails only the
 * interaction-endpoint row; later rows resolve `n/a`, never cascading fails.
 */
export async function vcalmFloorOutcomes(
	result: VcalmVerifierFlowResult,
	probe: (url: string) => Promise<TlsProbeResult>
): Promise<{ outcomes: VerifierCheckOutcome[]; activity: WalletActivity[] }> {
	const IDS = VCALM_FLOOR_ROW_IDS;
	const activity: WalletActivity[] = [];
	const interactionStep = stepIndexOf(IDS.interactionEndpoint);
	const vprStep = stepIndexOf(IDS.vprDidAuth);
	const responseStep = stepIndexOf(IDS.responseTls);

	// 1. Interaction endpoint — the fetch resolved a `vcapi` protocol entry.
	if (!result.fetch.ok || !result.fetch.vcapiUrl) {
		const message =
			result.fetch.error ?? 'The interaction URL did not advertise a `vcapi` exchange endpoint.';
		const endpoint = floorOutcome(IDS.interactionEndpoint, 'fail', message);
		activity.push(checkActivity(endpoint, 'Interaction endpoint', interactionStep));
		return {
			outcomes: [
				endpoint,
				...notChecked(
					[IDS.vprQuery, IDS.vprDidAuth, IDS.requestTls, IDS.responseTls],
					'Not checked — the interaction URL did not resolve an exchange endpoint.'
				)
			],
			activity
		};
	}
	const interaction = floorOutcome(
		IDS.interactionEndpoint,
		'pass',
		'The interaction URL advertised a `vcapi` exchange endpoint.'
	);
	activity.push(checkActivity(interaction, 'Interaction endpoint', interactionStep));

	// 2. VPR credential query (QueryByExample matchable) — requires a returned VPR.
	const query = !result.vprReceived
		? floorOutcome(IDS.vprQuery, 'fail', 'The exchange returned no presentation request.')
		: result.matched
			? floorOutcome(
					IDS.vprQuery,
					'pass',
					'The presentation request asks for an OpenBadgeCredential via QueryByExample.'
				)
			: floorOutcome(
					IDS.vprQuery,
					'fail',
					result.matchReason ?? 'The presentation request did not ask for an OpenBadgeCredential.'
				);
	activity.push(checkActivity(query, 'Presentation request query', vprStep));

	// 3. DIDAuthentication query.
	const didAuth = result.didAuth
		? floorOutcome(
				IDS.vprDidAuth,
				'pass',
				'The presentation request includes a DIDAuthentication query.'
			)
		: floorOutcome(
				IDS.vprDidAuth,
				'fail',
				'The presentation request does not include a DIDAuthentication query.'
			);
	activity.push(checkActivity(didAuth, 'DID authentication query', vprStep));

	// 4. TLS on the interaction URL (already probed by the transport) and the vcapi host.
	const requestTls = tlsOutcome(IDS.requestTls, 'interaction endpoint', result.fetch.tls);
	activity.push(checkActivity(requestTls, 'Interaction endpoint TLS', interactionStep));
	const responseTls = tlsOutcome(
		IDS.responseTls,
		'exchange endpoint',
		await probe(result.fetch.vcapiUrl)
	);
	activity.push(checkActivity(responseTls, 'Exchange endpoint TLS', responseStep));

	return { outcomes: [interaction, query, didAuth, requestTls, responseTls], activity };
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build one automated floor outcome (every floor row is a MUST). */
function floorOutcome(
	id: string,
	status: VerifierCheckOutcome['status'],
	message: string
): VerifierCheckOutcome {
	return { id, level: 'MUST', status, message, source: 'automated' };
}

/** `n/a` outcomes for floor rows not reached (intake failed — no cascading fails). */
function notChecked(ids: string[], note: string): VerifierCheckOutcome[] {
	return ids.map((id) => floorOutcome(id, 'n/a', note));
}

/** Score one TLS probe result onto a floor row for the probed endpoint. */
function tlsOutcome(
	id: string,
	endpointLabel: string,
	probe: TlsProbeResult | undefined
): VerifierCheckOutcome {
	if (probe?.atLeastTls12) {
		return floorOutcome(id, 'pass', `The ${endpointLabel} negotiated ${probe.protocol}.`);
	}
	const detail =
		probe?.error ??
		(probe?.protocol
			? `it negotiated ${probe.protocol}, below TLS 1.2`
			: 'the TLS version could not be determined');
	return floorOutcome(id, 'fail', `The ${endpointLabel} did not meet TLS 1.2: ${detail}`);
}

const OUTCOME_ACTIVITY_STATUS: Record<VerifierCheckOutcome['status'], WalletActivityStatus> = {
	pass: 'ok',
	warn: 'warn',
	fail: 'fail',
	'n/a': 'skipped'
};

/** Narrate one floor outcome as a `check` activity entry. */
function checkActivity(
	outcome: VerifierCheckOutcome,
	label: string,
	stepIndex?: number
): WalletActivity {
	return {
		id: `vcalm-present.${outcome.id}`,
		kind: 'check',
		label,
		status: OUTCOME_ACTIVITY_STATUS[outcome.status],
		detail: outcome.message,
		...(stepIndex !== undefined ? { stepIndex } : {})
	};
}

/** Step index (for activity cross-highlighting) of the vcalm checklist row carrying `rowId`. */
function stepIndexOf(rowId: string): number | undefined {
	const combination = combinationFor('verifier', 'credential-request-and-verification', 'vcalm');
	const index = combination?.checklist.steps.findIndex((step) =>
		step.requirements.some((req) => req.id === rowId)
	);
	return index !== undefined && index >= 0 ? index : undefined;
}
