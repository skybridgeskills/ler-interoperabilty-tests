import type {
	VerifyResult,
	WalletCrypto,
	WalletCryptosuite
} from '$lib/server/domain/wallet-crypto/index.js';

import type { FetchInteractionResult, IssuerFlowTransport } from '../issuer-flow-transport.js';

/** DIDAuth request observation (step 2). */
export type DidAuthObservation = {
	status: number;
	challenge?: string;
	domain?: string;
	vpr?: unknown;
	error?: string;
};

/** Credential-delivery observation (step 3). */
export type DeliveryObservation = {
	status: number;
	credential?: unknown;
	holderDid?: string;
	presentation?: unknown;
	error?: string;
};

/** Everything the flow observed, filled progressively as steps run. */
export type IssuerFlowObservations = {
	interaction?: FetchInteractionResult;
	didAuth?: DidAuthObservation;
	delivery?: DeliveryObservation;
	verify?: VerifyResult;
	holder?: { did: string; cryptosuite: WalletCryptosuite };
};

/** Outcome of one run-to-completion issuer flow. */
export type IssuerFlowRunResult = {
	observations: IssuerFlowObservations;
	/** `true` when a step's result made further progress impossible. */
	blocked: boolean;
	/** 1-based index of the step the run stopped at (only when `blocked`). */
	stoppedAtStep?: number;
};

/** The service the `/run` route depends on: drive a VCALM issuer flow to completion. */
export interface VcalmIssuerFlow {
	runIssuerFlow(
		interactionUrl: string,
		cryptosuite?: WalletCryptosuite
	): Promise<IssuerFlowRunResult>;
}

/**
 * VCALM issuer-flow driver: acts as the holder against a **user-supplied** exchange, running the
 * whole flow in one pass (fetch interaction → request DIDAuth → sign + submit → receive + verify)
 * and stopping at the first blocking failure. Steps are exposed for unit testing; `runIssuerFlow`
 * orchestrates them and threads a plain in-memory accumulator (no persisted state).
 */
export function VcalmIssuerFlowDriver(deps: {
	crypto: WalletCrypto;
	transport: IssuerFlowTransport;
}) {
	/** Step 1 — fetch the pasted interaction URL, discover protocols + `vcapi`, probe TLS. */
	function fetchInteraction(interactionUrl: string): Promise<FetchInteractionResult> {
		return deps.transport.fetchInteractionUrl(interactionUrl);
	}

	/** Step 2 — POST `{}` to `vcapi`; read the DIDAuthentication request. */
	async function requestDidAuth(vcapiUrl: string): Promise<DidAuthObservation> {
		const res = await deps.transport.postToVcapi(vcapiUrl, {});
		const body = res.rawBody as Record<string, unknown> | undefined;
		const vpr = body?.verifiablePresentationRequest as
			| { challenge?: string; domain?: string }
			| undefined;
		return {
			status: res.status,
			challenge: vpr?.challenge,
			domain: vpr?.domain,
			vpr,
			error: res.error ?? (vpr?.challenge ? undefined : 'No DIDAuthentication challenge returned.')
		};
	}

	/** Step 3 — sign a challenge-bound holder VP, submit it, extract the issued credential. */
	async function authenticateAndReceive(
		vcapiUrl: string,
		cryptosuite: WalletCryptosuite,
		challenge: string,
		domain?: string
	): Promise<DeliveryObservation & { holderDid: string }> {
		const holder = await deps.crypto.generateKey(cryptosuite);
		const presentation = await deps.crypto.signPresentation({ holder, challenge, domain });
		const res = await deps.transport.postToVcapi(vcapiUrl, {
			verifiablePresentation: presentation
		});
		const credential = extractIssuedCredential(res.rawBody);
		return {
			status: res.status,
			credential,
			presentation,
			holderDid: holder.did,
			error: res.error ?? (credential === undefined ? 'No credential was issued.' : undefined)
		};
	}

	/** Step 4 — verify the issued credential's data-integrity proof. */
	function verifyReceived(credential: unknown): Promise<VerifyResult> {
		return deps.crypto.verifyCredential(credential);
	}

	async function runIssuerFlow(
		interactionUrl: string,
		cryptosuite: WalletCryptosuite = 'eddsa-rdfc-2022'
	): Promise<IssuerFlowRunResult> {
		const observations: IssuerFlowObservations = {};

		observations.interaction = await fetchInteraction(interactionUrl);
		if (!observations.interaction.ok || !observations.interaction.vcapiUrl) {
			return { observations, blocked: true, stoppedAtStep: 1 };
		}

		observations.didAuth = await requestDidAuth(observations.interaction.vcapiUrl);
		if (!observations.didAuth.challenge) {
			return { observations, blocked: true, stoppedAtStep: 2 };
		}

		const delivery = await authenticateAndReceive(
			observations.interaction.vcapiUrl,
			cryptosuite,
			observations.didAuth.challenge,
			observations.didAuth.domain
		);
		observations.delivery = {
			status: delivery.status,
			credential: delivery.credential,
			holderDid: delivery.holderDid,
			presentation: delivery.presentation,
			error: delivery.error
		};
		observations.holder = { did: delivery.holderDid, cryptosuite };
		if (delivery.credential === undefined) {
			return { observations, blocked: true, stoppedAtStep: 3 };
		}

		observations.verify = await verifyReceived(delivery.credential);
		return { observations, blocked: false };
	}

	return {
		fetchInteraction,
		requestDidAuth,
		authenticateAndReceive,
		verifyReceived,
		runIssuerFlow
	};
}
export type VcalmIssuerFlowDriver = ReturnType<typeof VcalmIssuerFlowDriver>;

/** Pull the issued VC out of a VC-API presentation response (issuer returns a VP or a VC). */
function extractIssuedCredential(response: unknown): unknown {
	const obj = response as Record<string, unknown> | null;
	const vp = obj?.verifiablePresentation as { verifiableCredential?: unknown } | undefined;
	const fromVp = vp?.verifiableCredential;
	if (Array.isArray(fromVp)) return fromVp[0];
	if (fromVp) return fromVp;
	if (obj?.verifiableCredential) return obj.verifiableCredential;
	return undefined;
}
