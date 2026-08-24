import type { Oid4IssuerSummary, WireTrace } from '$lib/interop/scenario-run/index.js';

import type {
	Oid4IssuerFlow,
	Oid4IssuerFlowObservations,
	Oid4StepObservation
} from '../wallet-client/index.js';
import type { WalletCryptosuite } from '../wallet-crypto/index.js';
import { traceBody } from '../wire-trace/index.js';

import { ReceiveInputError } from './receive-input-error.js';
import { subjectIdOf, summariseTls } from './summary-helpers.js';
import type { ReceiveFromIssuerResult } from './types.js';

/** The cryptosuites the suite can sign a `di_vp` key proof with. */
const CRYPTOSUITE_BUNDLE = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

/**
 * Receive a credential from the operator's issuer over **OID4VCI's
 * pre-authorized-code flow**: parse the pasted credential offer, read the
 * issuer's metadata, redeem the code, present a `di_vp` key proof, take
 * delivery, verify.
 *
 * As with the VCALM leaf, this adds **no protocol code** —
 * `Oid4IssuerFlowDriver` already does all of it — and owns only the projection
 * into the client-safe {@link Oid4IssuerSummary}, independently of the legacy
 * `wallet-runner` engine.
 *
 * **Intake semantics: parse-fail throws, protocol-fail is scored.** Only a blank
 * paste throws; a malformed offer link, unreachable metadata, a refused token or
 * a rejected key proof all come back as `delivered: false` with a reason.
 *
 * **No access token ever enters the summary.** The driver already keeps its
 * token to `{ redeemed, cNonce }` and off its transcript; this summary carries
 * only whether one was redeemed, because it is serialised to the browser. The
 * same is true of the {@link WireTrace} this returns: it is projected from the
 * driver's already-redacted transcript, and adds no header of its own.
 */
export async function receiveFromOid4Issuer(args: {
	/** The operator's `openid-credential-offer://` URL. */
	input: string;
	/** The suite's own holder key-proof cryptosuite for the `di_vp` proof. */
	keyProofSuite: WalletCryptosuite;
	flow: Oid4IssuerFlow;
}): Promise<ReceiveFromIssuerResult> {
	const offerUrl = args.input.trim();
	if (offerUrl === '') {
		throw new ReceiveInputError('Paste the credential offer URL from your issuer.');
	}

	const { observations } = await args.flow.runIssuerFlow(offerUrl, args.keyProofSuite);
	const { issuerMeta, token, delivery, verify, holder, tls } = observations;

	const proofTypesOffered = Object.keys(issuerMeta?.proofTypesSupported ?? {});
	const diVpSigningAlgs = issuerMeta?.diVpSigningAlgs ?? [];
	const credential = delivery?.credential;
	const delivered = credential !== undefined;

	const flowSummary: Oid4IssuerSummary = {
		transport: 'oid4vci',
		verified: verify?.verified === true,
		...(verify?.verified !== true && verify?.errors?.length ? { verifyErrors: verify.errors } : {}),
		metadataReachable: !!issuerMeta?.credentialEndpoint,
		diVpOffered: proofTypesOffered.includes('di_vp'),
		proofTypesOffered,
		diVpSigningAlgs,
		diVpSigningAlgInBundle: diVpSigningAlgs.some((alg) => CRYPTOSUITE_BUNDLE.includes(alg)),
		preAuthCodeRedeemed: token?.redeemed === true,
		credentialDelivered: delivered,
		...(delivery?.status !== undefined ? { credentialStatus: delivery.status } : {}),
		// One host serves the metadata, token and credential endpoints, so one
		// probe covers all three — which is why the engine's `tls` and
		// `tls-credential` rows collapse to a single check (mapping.md § 3).
		issuerTls: summariseTls(
			tls,
			'The credential issuer was never reached, so its TLS could not be probed.'
		),
		...(holder?.did ? { holderDid: holder.did } : {}),
		...(subjectIdOf(credential) !== undefined ? { subjectId: subjectIdOf(credential) } : {})
	};

	return {
		flow: flowSummary,
		...(delivered ? { credential } : {}),
		delivered,
		trace: traceOf(observations),
		...(delivered ? {} : { error: { message: failureReason(observations) } })
	};
}

/** What each transcript step is called in the operator's Details panel. */
const STAGE_LABELS: Record<Oid4StepObservation['name'], string> = {
	offer: 'Credential offer',
	'issuer-metadata': 'Credential issuer metadata',
	'as-metadata': 'Authorization server metadata',
	token: 'Token request',
	nonce: 'Nonce request',
	credential: 'Credential request'
};

/**
 * Project the driver's transcript into the display trace, one stage per observed
 * request, in order.
 *
 * **Nothing is filtered.** A flow that stopped early is exactly what an operator
 * needs to see, and the last stage present is where it stopped — a filtered
 * trace would hide the answer to the only question being asked of it.
 *
 * The delivered credential is deliberately absent: it rides
 * `StepEvidence.artifact`, so there is one place to look for what moved.
 */
function traceOf(observations: Oid4IssuerFlowObservations): WireTrace {
	return {
		stages: (observations.transcript ?? []).map((step) => ({
			name: step.name,
			label: STAGE_LABELS[step.name] ?? step.name,
			method: step.method,
			url: step.url,
			status: step.status,
			ok: step.ok,
			...traceBody(step.responseBody),
			...(step.error !== undefined ? { error: step.error } : {})
		}))
	};
}

/** The most specific reason the flow delivered nothing, read in the order the flow runs. */
function failureReason(observations: Oid4IssuerFlowObservations): string {
	const { offer, issuerMeta, token, delivery, transcript } = observations;
	if (!offer?.credentialIssuer) {
		const offerStep = transcript?.find((step) => step.name === 'offer');
		return offerStep?.error
			? `We could not read your credential offer: ${offerStep.error}`
			: 'Your credential offer named no credential issuer.';
	}
	if (!offer.preAuthCode) {
		return 'Your credential offer carried no pre-authorized code.';
	}
	if (!issuerMeta?.credentialEndpoint) {
		// As in the VCALM leaf: name the endpoint we were reaching for, because the
		// driver's own error can be as bare as "fetch failed".
		const metaStep = transcript?.find((step) => step.name === 'issuer-metadata');
		return metaStep?.error
			? `We could not read your credential-issuer metadata: ${metaStep.error}`
			: 'Your issuer metadata named no credential endpoint.';
	}
	if (token?.redeemed !== true) {
		const tokenStep = transcript?.find((step) => step.name === 'token');
		return tokenStep?.error
			? `Your token endpoint refused the pre-authorized code: ${tokenStep.error}`
			: 'Your pre-authorized code was not redeemed for an access token.';
	}
	return delivery?.error ?? 'Your issuer delivered no credential.';
}
