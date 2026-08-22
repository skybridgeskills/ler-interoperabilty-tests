import type { TraceStage, VcalmIssuerSummary, WireTrace } from '$lib/interop/scenario-run/index.js';

import type { IssuerFlowObservations, VcalmIssuerFlow } from '../wallet-client/index.js';
import type { WalletCryptosuite } from '../wallet-crypto/index.js';
import { traceBody } from '../wire-trace/index.js';

import { ReceiveInputError } from './receive-input-error.js';
import { subjectIdOf, summariseTls } from './summary-helpers.js';
import type { ReceiveFromIssuerResult } from './types.js';

/**
 * Receive a credential from the operator's issuer over a **VC-API exchange the
 * operator's issuer drives**: fetch the pasted interaction URL, discover the
 * `vcapi` endpoint, answer the DIDAuthentication challenge as holder, take
 * delivery, verify.
 *
 * This adds **no protocol code** — `VcalmIssuerFlowDriver` already does all of
 * it. What this leaf owns is the boundary: projecting the driver's observations
 * into the client-safe {@link VcalmIssuerSummary} the `automatic` checks read,
 * independently of the legacy `wallet-runner` scoring engine (which stays
 * standing until M13 and is deliberately not imported here). It is the exact
 * inverse of `verifier-present/present-to-vcalm-verifier.ts`.
 *
 * **Intake semantics: parse-fail throws, protocol-fail is scored.** A blank or
 * non-URL paste is a {@link ReceiveInputError} (a 400 — nothing was measured).
 * Everything the protocol does — an unreachable interaction URL, no `vcapi`
 * entry, no DIDAuthentication challenge, a refused delivery — comes back as
 * `delivered: false` with a reason and as complete a summary as was observed,
 * so the operator can fix it and try again.
 *
 * Hermetic: the driver is injected, never reached for through `appContext()`.
 */
export async function receiveFromVcalmIssuer(args: {
	/** The operator's VC-API interaction URL. */
	input: string;
	/** The suite's own holder key-proof cryptosuite for the DIDAuthentication VP. */
	keyProofSuite: WalletCryptosuite;
	flow: VcalmIssuerFlow;
}): Promise<ReceiveFromIssuerResult> {
	const url = args.input.trim();
	if (url === '') {
		throw new ReceiveInputError('Paste the interaction URL from your issuer.');
	}
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new ReceiveInputError('The interaction URL must be an absolute http(s) URL.');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new ReceiveInputError('The interaction URL must use http or https.');
	}

	const { observations } = await args.flow.runIssuerFlow(url, args.keyProofSuite);
	const { interaction, didAuth, delivery, verify, holder } = observations;

	// One driver probe answers two checklist rows — the interaction URL resolved
	// and the participation endpoint answered are the same observation. Both are
	// kept (faithful to the checklist) and both checks say so.
	const interactionFetched = !!interaction?.ok && !!interaction.protocols;

	const credential = delivery?.credential;
	const delivered = credential !== undefined;

	const flowSummary: VcalmIssuerSummary = {
		transport: 'vcalm',
		verified: verify?.verified === true,
		...(verify?.verified !== true && verify?.errors?.length ? { verifyErrors: verify.errors } : {}),
		interactionFetched,
		participationOk: interactionFetched,
		vcapiAdvertised: !!interaction?.vcapiUrl,
		didAuthRequested: !!didAuth?.challenge,
		...(didAuth?.challenge && !vprHasDidAuthQuery(didAuth.vpr)
			? { didAuthQueryMissing: true }
			: {}),
		interactionTls: summariseTls(
			interaction?.tls,
			'The interaction endpoint was never reached, so its TLS could not be probed.'
		),
		...(holder?.did ? { holderDid: holder.did } : {}),
		...(subjectIdOf(credential) !== undefined ? { subjectId: subjectIdOf(credential) } : {})
	};

	return {
		flow: flowSummary,
		...(delivered ? { credential } : {}),
		delivered,
		trace: traceOf(url, observations),
		...(delivered ? {} : { error: { message: failureReason(observations) } })
	};
}

/**
 * Project the flow's observations into the display trace.
 *
 * Unlike OID4VCI, this driver keeps no transcript — it keeps the *facts* each
 * leg produced. So the three stages are synthesised from those facts in flow
 * order, and a leg the flow never reached simply has no stage: the last stage
 * present is where it stopped, which is the same contract the OID4 trace has.
 *
 * The delivered credential is **not** here. It rides `StepEvidence.artifact`,
 * and duplicating it would give the operator two places to look for one thing.
 * The presentation is carried instead, because that is what this leg actually
 * exchanged.
 */
function traceOf(interactionUrl: string, observations: IssuerFlowObservations): WireTrace {
	const { interaction, didAuth, delivery } = observations;
	const stages: TraceStage[] = [];

	if (interaction) {
		stages.push({
			name: 'interaction',
			label: 'Interaction URL',
			method: 'GET',
			url: interactionUrl,
			status: interaction.status,
			ok: interaction.ok,
			...traceBody(interaction.protocols ?? interaction.rawBody),
			...(interaction.error !== undefined ? { error: interaction.error } : {})
		});
	}

	if (didAuth) {
		stages.push({
			name: 'didauth',
			label: 'DIDAuth request',
			status: didAuth.status,
			// A challenge is what this leg exists to obtain; without one the
			// exchange cannot continue, whatever the status said.
			ok: !!didAuth.challenge && didAuth.error === undefined,
			// The VPR is the artifact worth reading here — it is what the issuer
			// asked the holder for.
			...traceBody(didAuth.vpr),
			...(didAuth.error !== undefined ? { error: didAuth.error } : {})
		});
	}

	if (delivery) {
		stages.push({
			name: 'delivery',
			label: 'Credential delivery',
			method: 'POST',
			...(interaction?.vcapiUrl !== undefined ? { url: interaction.vcapiUrl } : {}),
			status: delivery.status,
			ok: delivery.credential !== undefined,
			...traceBody(delivery.presentation),
			...(delivery.error !== undefined ? { error: delivery.error } : {})
		});
	}

	return { stages };
}

/** Whether a VPR's `query` (object or array) declares a DIDAuthentication query. */
function vprHasDidAuthQuery(vpr: unknown): boolean {
	const query = (vpr as { query?: unknown } | undefined)?.query;
	const isDidAuth = (q: unknown) =>
		!!q && typeof q === 'object' && (q as { type?: unknown }).type === 'DIDAuthentication';
	return Array.isArray(query) ? query.some(isDidAuth) : isDidAuth(query);
}

/** The most specific reason the exchange delivered nothing — read in the operator's step-by-step order. */
function failureReason(observations: {
	interaction?: { ok: boolean; status: number; vcapiUrl?: string; error?: string };
	didAuth?: { error?: string };
	delivery?: { error?: string };
}): string {
	const { interaction, didAuth, delivery } = observations;
	if (!interaction?.ok) {
		// The driver's own error can be as bare as "fetch failed", which tells an
		// operator nothing about which of their endpoints to look at.
		return interaction?.error
			? `We could not reach your interaction URL: ${interaction.error}`
			: `Your interaction URL responded ${interaction?.status ?? 0}.`;
	}
	if (!interaction.vcapiUrl) {
		return 'The interaction URL advertised no `vcapi` exchange endpoint.';
	}
	if (didAuth?.error) return didAuth.error;
	return delivery?.error ?? 'Your issuer delivered no credential.';
}
