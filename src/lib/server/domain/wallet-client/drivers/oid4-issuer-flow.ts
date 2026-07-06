import type {
	VerifyResult,
	WalletCrypto,
	WalletCryptosuite
} from '$lib/server/domain/wallet-crypto/index.js';

import { probeTls, type TlsProbeResult } from '../exchange-flow-transport.js';
import {
	PRE_AUTH_GRANT,
	extractCredential,
	parseOfferLink,
	preAuthorizedCodeOf,
	wellKnownMetadataUrl,
	type CredentialOffer
} from '../oid4vci/index.js';

type FetchLike = typeof fetch;

/** One observed OID4VCI HTTP request/response (access tokens redacted from `responseBody`). */
export type Oid4StepObservation = {
	name: 'offer' | 'issuer-metadata' | 'as-metadata' | 'token' | 'nonce' | 'credential';
	method: 'GET' | 'POST';
	url: string;
	ok: boolean;
	status: number;
	responseBody: unknown;
	error?: string;
};

/** Everything the OID4VCI issuer flow observed, filled progressively as steps run. */
export type Oid4IssuerFlowObservations = {
	offerUrl?: string;
	tls?: TlsProbeResult;
	offer?: { credentialIssuer?: string; preAuthCode?: string; configurationId?: string };
	issuerMeta?: {
		credentialEndpoint?: string;
		nonceEndpoint?: string;
		proofTypesSupported?: Record<string, unknown>;
		diVpSigningAlgs?: string[];
		raw?: unknown;
	};
	asMeta?: { tokenEndpoint?: string; grantTypesSupported?: string[]; raw?: unknown };
	/** Never stores the access token — only whether it was redeemed + any `c_nonce`. */
	token?: { redeemed: boolean; cNonce?: string };
	nonce?: { cNonce?: string };
	delivery?: {
		status: number;
		credential?: unknown;
		presentation?: unknown;
		holderDid?: string;
		error?: string;
	};
	verify?: VerifyResult;
	holder?: { did: string; cryptosuite: WalletCryptosuite };
	/** Ordered per-step request/response log (access tokens redacted). */
	transcript: Oid4StepObservation[];
};

/** Outcome of one run-to-completion OID4VCI issuer flow. */
export type Oid4IssuerFlowRunResult = {
	observations: Oid4IssuerFlowObservations;
	/** `true` when a step's result made further progress impossible. */
	blocked: boolean;
	/** 1-based checklist step (1..3) the run stopped at (only when `blocked`). */
	stoppedAtStep?: number;
};

/** The service the OID4 issuer-flow route depends on: drive an OID4VCI pre-auth flow to completion. */
export interface Oid4IssuerFlow {
	runIssuerFlow(
		offerUrl: string,
		cryptosuite?: WalletCryptosuite
	): Promise<Oid4IssuerFlowRunResult>;
}

/** Mutable per-run accumulator. The access token is carried here and is NEVER serialized. */
type RunCtx = {
	observations: Oid4IssuerFlowObservations;
	offer?: CredentialOffer;
	issuer?: string;
	configurationId?: string;
	credentialEndpoint?: string;
	nonceEndpoint?: string;
	tokenEndpoint?: string;
	/** Bearer token — kept off `observations`/`transcript` entirely. */
	accessToken?: string;
	cNonce?: string;
};

type StepStop = { blocked: true; stoppedAtStep: number };

/**
 * OID4VCI 1.0 issuer-flow driver: acts as the holder against a **user-pasted** credential-offer
 * URL, running the whole pre-authorized-code flow in one pass and stopping at the first blocking
 * failure. Every HTTP call is captured as an {@link Oid4StepObservation} (never thrown) and mapped
 * onto the 3 checklist steps:
 *
 *   1. offer + issuer/AS metadata
 *   2. token redemption + `c_nonce`
 *   3. credential request (`di_vp` key proof) + verification
 *
 * A JWT key proof is intentionally never produced — the OID4 profile requires `di_vp`.
 */
export function Oid4IssuerFlowDriver(deps: { crypto: WalletCrypto; fetchImpl?: FetchLike }) {
	const doFetch: FetchLike = deps.fetchImpl ?? fetch;

	/** Run a single HTTP call, capturing it as an observation and never throwing. */
	async function observe(
		name: Oid4StepObservation['name'],
		method: 'GET' | 'POST',
		url: string,
		init: RequestInit,
		redact: (body: Record<string, unknown>) => unknown = (b) => b
	): Promise<{ obs: Oid4StepObservation; body?: Record<string, unknown> }> {
		try {
			const res = await doFetch(url, { method, ...init });
			const body = await parseBody(res);
			const record =
				body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
			return {
				obs: {
					name,
					method,
					url,
					ok: res.ok,
					status: res.status,
					responseBody: record ? redact(record) : body,
					error: res.ok ? undefined : `${name} request to ${url} responded ${res.status}.`
				},
				body: record
			};
		} catch (e) {
			return {
				obs: {
					name,
					method,
					url,
					ok: false,
					status: 0,
					responseBody: null,
					error: e instanceof Error ? e.message : String(e)
				}
			};
		}
	}

	/** Step 1 — parse the pasted offer, probe TLS, discover issuer + AS metadata. */
	async function step1OfferAndMetadata(
		ctx: RunCtx,
		offerUrl: string
	): Promise<StepStop | undefined> {
		const obs = ctx.observations;
		obs.offerUrl = offerUrl;

		// Resolve the offer (inline or via credential_offer_uri).
		let parsed;
		try {
			parsed = parseOfferLink(offerUrl);
		} catch (e) {
			obs.transcript.push({
				name: 'offer',
				method: 'GET',
				url: offerUrl,
				ok: false,
				status: 0,
				responseBody: null,
				error: e instanceof Error ? e.message : String(e)
			});
			return { blocked: true, stoppedAtStep: 1 };
		}
		if (parsed.kind === 'inline') {
			ctx.offer = parsed.offer;
		} else {
			const { obs: o, body } = await observe('offer', 'GET', parsed.offerUri, {
				headers: { Accept: 'application/json' }
			});
			obs.transcript.push(o);
			if (!o.ok || !body) return { blocked: true, stoppedAtStep: 1 };
			ctx.offer = body as CredentialOffer;
		}

		const issuer = String(ctx.offer.credential_issuer ?? '');
		ctx.issuer = issuer;
		const preAuthCode = preAuthorizedCodeOf(ctx.offer);
		ctx.configurationId = ctx.offer.credential_configuration_ids?.[0];
		obs.offer = {
			credentialIssuer: issuer || undefined,
			preAuthCode,
			configurationId: ctx.configurationId
		};

		obs.tls = await probeTls(issuer);

		if (!issuer) return { blocked: true, stoppedAtStep: 1 };
		if (!preAuthCode) return { blocked: true, stoppedAtStep: 1 };

		// Issuer metadata (blocking if unreachable).
		const issuerMetaUrl = wellKnownMetadataUrl(issuer, 'openid-credential-issuer');
		const { obs: im, body: issuerMeta } = await observe('issuer-metadata', 'GET', issuerMetaUrl, {
			headers: { Accept: 'application/json' }
		});
		obs.transcript.push(im);
		if (!im.ok || !issuerMeta) return { blocked: true, stoppedAtStep: 1 };

		const proofTypes = configProofTypes(issuerMeta, ctx.configurationId);
		ctx.credentialEndpoint = issuerMeta.credential_endpoint as string | undefined;
		ctx.nonceEndpoint = issuerMeta.nonce_endpoint as string | undefined;
		obs.issuerMeta = {
			credentialEndpoint: ctx.credentialEndpoint,
			nonceEndpoint: ctx.nonceEndpoint,
			proofTypesSupported: proofTypes,
			diVpSigningAlgs: diVpSigningAlgs(proofTypes),
			raw: issuerMeta
		};

		// AS metadata (non-blocking; fall back to `${issuer}/token`).
		const asMetaUrl = wellKnownMetadataUrl(issuer, 'oauth-authorization-server');
		const { obs: am, body: asMeta } = await observe('as-metadata', 'GET', asMetaUrl, {
			headers: { Accept: 'application/json' }
		});
		obs.transcript.push(am);
		if (am.ok && asMeta) {
			ctx.tokenEndpoint = (asMeta.token_endpoint as string | undefined) ?? `${issuer}/token`;
			obs.asMeta = {
				tokenEndpoint: ctx.tokenEndpoint,
				grantTypesSupported: asMeta.grant_types_supported as string[] | undefined,
				raw: asMeta
			};
		} else {
			ctx.tokenEndpoint = `${issuer}/token`;
			obs.asMeta = { tokenEndpoint: ctx.tokenEndpoint };
		}

		return undefined;
	}

	/** Step 2 — redeem the pre-auth code for an access token + a `c_nonce`. */
	async function step2TokenAndNonce(ctx: RunCtx): Promise<StepStop | undefined> {
		const obs = ctx.observations;
		const tokenEndpoint = ctx.tokenEndpoint ?? `${ctx.issuer}/token`;
		const preAuthCode = preAuthorizedCodeOf(ctx.offer ?? { credential_issuer: '' });

		const { obs: to, body: token } = await observe(
			'token',
			'POST',
			tokenEndpoint,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json'
				},
				body: new URLSearchParams({
					grant_type: PRE_AUTH_GRANT,
					'pre-authorized_code': String(preAuthCode ?? '')
				})
			},
			redactAccessToken
		);
		obs.transcript.push(to);

		ctx.accessToken = token?.access_token as string | undefined;
		const tokenCNonce = token?.c_nonce as string | undefined;
		obs.token = { redeemed: to.ok && Boolean(ctx.accessToken), cNonce: tokenCNonce };
		if (!to.ok || !ctx.accessToken) return { blocked: true, stoppedAtStep: 2 };

		ctx.cNonce = tokenCNonce;

		// Fetch a c_nonce if the token response didn't carry one.
		if (!ctx.cNonce && ctx.nonceEndpoint) {
			const { obs: no, body: nonce } = await observe('nonce', 'POST', ctx.nonceEndpoint, {
				headers: { Accept: 'application/json', Authorization: `Bearer ${ctx.accessToken}` }
			});
			obs.transcript.push(no);
			const nonceCNonce = nonce?.c_nonce as string | undefined;
			obs.nonce = { cNonce: nonceCNonce };
			ctx.cNonce = ctx.cNonce ?? nonceCNonce;
		}

		if (!ctx.cNonce) return { blocked: true, stoppedAtStep: 2 };
		return undefined;
	}

	/** Step 3 — build the `di_vp` key proof, request + verify the credential. */
	async function step3CredentialAndVerify(
		ctx: RunCtx,
		cryptosuite: WalletCryptosuite
	): Promise<StepStop | undefined> {
		const obs = ctx.observations;
		const issuer = ctx.issuer ?? '';
		const cNonce = ctx.cNonce ?? '';

		if (!ctx.credentialEndpoint) {
			obs.delivery = { status: 0, error: 'Issuer metadata had no credential_endpoint.' };
			return { blocked: true, stoppedAtStep: 3 };
		}

		let holderDid: string;
		let keyProofVp: unknown;
		try {
			const holder = await deps.crypto.generateKey(cryptosuite);
			holderDid = holder.did;
			// di_vp key proof: a holder VP bound to the c_nonce + issuer domain.
			keyProofVp = await deps.crypto.signPresentation({
				holder,
				challenge: cNonce,
				domain: issuer
			});
		} catch (e) {
			obs.delivery = { status: 0, error: e instanceof Error ? e.message : String(e) };
			return { blocked: true, stoppedAtStep: 3 };
		}
		obs.holder = { did: holderDid, cryptosuite };

		const { obs: co, body: credentialResponse } = await observe(
			'credential',
			'POST',
			ctx.credentialEndpoint,
			{
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${ctx.accessToken}`
				},
				body: JSON.stringify({
					...(ctx.configurationId ? { credential_configuration_id: ctx.configurationId } : {}),
					proofs: { di_vp: [keyProofVp] }
				})
			}
		);
		obs.transcript.push(co);

		const credential = credentialResponse ? extractCredential(credentialResponse) : undefined;
		obs.delivery = {
			status: co.status,
			credential,
			presentation: keyProofVp,
			holderDid,
			error: co.error ?? (credential === undefined ? 'No credential was issued.' : undefined)
		};
		if (credential === undefined) return { blocked: true, stoppedAtStep: 3 };

		// A credential that fails verification is NOT blocking (recorded for the issuer-did check).
		try {
			obs.verify = await deps.crypto.verifyCredential(credential);
		} catch (e) {
			obs.verify = { verified: false, errors: [e instanceof Error ? e.message : String(e)] };
		}
		return undefined;
	}

	async function runIssuerFlow(
		offerUrl: string,
		cryptosuite: WalletCryptosuite = 'eddsa-rdfc-2022'
	): Promise<Oid4IssuerFlowRunResult> {
		const ctx: RunCtx = { observations: { transcript: [] } };

		const s1 = await step1OfferAndMetadata(ctx, offerUrl);
		if (s1) return { observations: ctx.observations, ...s1 };

		const s2 = await step2TokenAndNonce(ctx);
		if (s2) return { observations: ctx.observations, ...s2 };

		const s3 = await step3CredentialAndVerify(ctx, cryptosuite);
		if (s3) return { observations: ctx.observations, ...s3 };

		return { observations: ctx.observations, blocked: false };
	}

	return {
		step1OfferAndMetadata,
		step2TokenAndNonce,
		step3CredentialAndVerify,
		runIssuerFlow
	};
}
export type Oid4IssuerFlowDriver = ReturnType<typeof Oid4IssuerFlowDriver>;

// ── helpers ──────────────────────────────────────────────────────────────────

/** Strip the access token from a token-endpoint response before it enters the transcript. */
function redactAccessToken(body: Record<string, unknown>): Record<string, unknown> {
	const { access_token: _redacted, ...rest } = body;
	void _redacted;
	return rest;
}

/** `credential_configurations_supported[configId].proof_types_supported` from issuer metadata. */
function configProofTypes(
	issuerMeta: Record<string, unknown>,
	configurationId?: string
): Record<string, unknown> | undefined {
	const configs = issuerMeta.credential_configurations_supported as
		| Record<string, { proof_types_supported?: Record<string, unknown> }>
		| undefined;
	if (!configs) return undefined;
	const config =
		(configurationId ? configs[configurationId] : undefined) ?? Object.values(configs)[0];
	return config?.proof_types_supported;
}

/** `proof_types_supported.di_vp.proof_signing_alg_values_supported`. */
function diVpSigningAlgs(proofTypes?: Record<string, unknown>): string[] | undefined {
	const diVp = proofTypes?.di_vp as { proof_signing_alg_values_supported?: string[] } | undefined;
	return diVp?.proof_signing_alg_values_supported;
}

/** Parse a response body as JSON, falling back to text (never throws). */
async function parseBody(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
