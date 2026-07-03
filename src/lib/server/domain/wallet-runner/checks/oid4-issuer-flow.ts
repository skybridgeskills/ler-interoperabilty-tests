import {
	issuerDidMethodCheck,
	ob3DirectDeliveryIssuerChecks,
	subjectOf,
	type CheckCtx,
	type CheckResult
} from '$lib/server/domain/issuer-runner/checks/ob3-direct-delivery-issuer.js';
import type { Oid4IssuerFlowObservations } from '$lib/server/domain/wallet-client/index.js';

/**
 * OID4 issuer-flow conformance checks, keyed by the `oid4.issuer.credential-issuance.*` requirement
 * ids on the base issuer OID4 checklist. Each reads the observations from the OID4VCI issuer-flow
 * driver and returns `undefined` until its step has run (rendered as *pending*). Step-3 credential
 * checks reuse the OB 3.0 issuer check logic (`ob3-direct-delivery-issuer.ts`).
 *
 * The profile standardizes OID4VCI issuance on the pre-authorized-code flow; there are no
 * authorization-code clauses.
 */
const P = 'oid4.issuer.credential-issuance.';

const CRYPTOSUITE_BUNDLE = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

type Oid4Check = (ctx: Oid4IssuerFlowObservations) => CheckResult | undefined;

const pass = (message: string): CheckResult => ({ status: 'pass', message });
const fail = (message: string): CheckResult => ({ status: 'fail', message });

/** Step 1 was attempted once the driver recorded the pasted offer URL. */
const step1Ran = (ctx: Oid4IssuerFlowObservations) => ctx.offerUrl !== undefined;

/** Adapt issuer-flow observations into the OB3 issuer `CheckCtx` (credential-only checks). */
function credCtx(ctx: Oid4IssuerFlowObservations): CheckCtx {
	return {
		credential: ctx.delivery?.credential,
		verifierResult: { verified: !!ctx.verify?.verified },
		includeAdditive: false
	};
}

/** Whether the issuer advertises a `di_vp` key-proof type in `proof_types_supported`. */
function offersDiVp(ctx: Oid4IssuerFlowObservations): boolean {
	const types = ctx.issuerMeta?.proofTypesSupported;
	return !!types && typeof types === 'object' && 'di_vp' in types;
}

/** Shared TLS check (the OID4VCI endpoints share the issuer host, so it is probed once). */
const tlsCheck: Oid4Check = (ctx) => {
	if (!step1Ran(ctx)) return undefined;
	if (!ctx.tls) return fail('Issuer host is not served over HTTPS (TLS 1.2+ required).');
	return ctx.tls.atLeastTls12
		? pass(`Endpoint negotiated ${ctx.tls.protocol}.`)
		: fail(
				ctx.tls.error ?? `Endpoint TLS version (${ctx.tls.protocol ?? 'unknown'}) is below TLS 1.2.`
			);
};

export const oid4IssuerFlowChecks: Record<string, Oid4Check> = {
	// ── Step 1 — provide credential offer + metadata ─────────────────────────────
	[`${P}metadata-endpoint`]: (ctx) => {
		if (!step1Ran(ctx)) return undefined;
		return ctx.issuerMeta?.credentialEndpoint
			? pass(
					`Credential issuer metadata is reachable for ${ctx.offer?.credentialIssuer ?? 'the credential issuer'}.`
				)
			: fail('Credential issuer metadata endpoint could not be fetched from the credential offer.');
	},

	[`${P}di-vp-proof-type`]: (ctx) => {
		if (!ctx.issuerMeta) return undefined;
		return offersDiVp(ctx)
			? pass('Issuer metadata advertises a `di_vp` key-proof type.')
			: fail(
					`Issuer metadata does not advertise a \`di_vp\` proof type (saw: ${Object.keys(ctx.issuerMeta.proofTypesSupported ?? {}).join(', ') || 'none'}).`
				);
	},

	[`${P}di-vp-signing-algs`]: (ctx) => {
		if (!ctx.issuerMeta) return undefined;
		const algs = ctx.issuerMeta.diVpSigningAlgs;
		if (!Array.isArray(algs) || algs.length === 0) {
			return fail('`proof_signing_alg_values_supported` is absent for the `di_vp` proof type.');
		}
		return algs.some((a) => CRYPTOSUITE_BUNDLE.includes(a))
			? pass(`\`di_vp\` signing algs advertise a supported cryptosuite (${algs.join(', ')}).`)
			: {
					status: 'warn',
					message: `\`di_vp\` signing algs (${algs.join(', ')}) list none of the data-integrity-cryptosuites bundle.`
				};
	},

	[`${P}not-jwt-only-proof`]: (ctx) => {
		if (!ctx.issuerMeta) return undefined;
		return offersDiVp(ctx)
			? pass('A `di_vp` key-proof type is offered; the issuer does not require a JWT-only proof.')
			: fail('No `di_vp` proof type is offered; this profile requires `di_vp` key proofs.');
	},

	[`${P}tls`]: tlsCheck,

	// ── Step 2 — issue an access token (pre-authorized-code) ─────────────────────
	[`${P}pre-authorized-code-flow`]: (ctx) => {
		if (!ctx.token) return undefined;
		return ctx.token.redeemed
			? pass(
					'The token endpoint accepted the pre-authorized-code grant and issued an access token.'
				)
			: fail('The token endpoint did not accept the pre-authorized-code grant.');
	},

	// ── Step 3 — process credential request and deliver ──────────────────────────
	[`${P}vcdm-2`]: (ctx) =>
		ctx.delivery
			? ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.vc-data-model-v2-compliant'](
					credCtx(ctx)
				)
			: undefined,

	[`${P}openbadge-3`]: (ctx) =>
		ctx.delivery
			? ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.openbadgecredential-type'](credCtx(ctx))
			: undefined,

	[`${P}di-proof`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		const proof = (del.credential as { proof?: Record<string, unknown> } | null)?.proof;
		if (!proof) return fail('`proof` is missing.');
		if (proof.type !== 'DataIntegrityProof')
			return fail('`proof.type` MUST be `DataIntegrityProof`.');
		if (typeof proof.cryptosuite !== 'string' || !CRYPTOSUITE_BUNDLE.includes(proof.cryptosuite)) {
			return fail(
				`\`proof.cryptosuite\` (${String(proof.cryptosuite)}) is not in the data-integrity-cryptosuites bundle.`
			);
		}
		if (typeof proof.created !== 'string' || Number.isNaN(Date.parse(proof.created))) {
			return fail('`proof.created` MUST be an ISO date string.');
		}
		if (typeof proof.verificationMethod !== 'string') {
			return fail('`proof.verificationMethod` MUST be a string.');
		}
		return pass(
			`${proof.cryptosuite} DataIntegrityProof with creation date + verification method.`
		);
	},

	[`${P}status-list`]: (ctx) =>
		ctx.delivery
			? adaptStatusList(
					ob3DirectDeliveryIssuerChecks['ob3-direct-delivery.bitstring-status-list-entry'](
						credCtx(ctx)
					)
				)
			: undefined,

	[`${P}issuer-did`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		const method = issuerDidMethodCheck(del.credential);
		if (method.status !== 'pass') return method;
		return ctx.verify?.verified
			? pass(
					`Issuer DID resolves and the credential verifies (${ctx.verify.issuerDid ?? 'issuer'}).`
				)
			: fail(
					`Issuer DID method is valid but the credential did not verify: ${ctx.verify?.errors?.join('; ') || 'not verified'}.`
				);
	},

	[`${P}di-vp-required`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		return del.credential !== undefined
			? pass(
					'The issuer accepted our `di_vp` key proof (bound to the issued `c_nonce` + issuer domain) and delivered a credential. Rejecting a malformed proof is not negatively probed.'
				)
			: fail(del.error ?? 'No credential was delivered in response to the `di_vp` key proof.');
	},

	[`${P}binds-verified-holder`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		if (del.credential === undefined) {
			return fail(del.error ?? 'No credential was delivered.');
		}
		const subjectId = subjectOf(del.credential)?.id;
		return ctx.holder?.did && subjectId === ctx.holder.did
			? pass('Issued credential is bound to the holder DID from the `di_vp` proof.')
			: fail(
					`credentialSubject.id (${typeof subjectId === 'string' ? subjectId : 'missing'}) does not match the holder DID.`
				);
	},

	[`${P}credential-endpoint`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		return del.credential !== undefined
			? pass(
					'The credential endpoint required a Bearer token and delivered a credential. Error handling / status codes are not negatively probed.'
				)
			: fail(del.error ?? `Credential endpoint responded ${del.status}.`);
	},

	[`${P}tls-credential`]: tlsCheck,

	[`${P}valid-until`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		const validUntil = (del.credential as { validUntil?: unknown } | null)?.validUntil;
		if (validUntil === undefined) {
			return {
				status: 'warn',
				message: '`validUntil` is not set; the credential declares no expiration.'
			};
		}
		return typeof validUntil === 'string' && !Number.isNaN(Date.parse(validUntil))
			? pass('`validUntil` present and parseable.')
			: fail('`validUntil` is present but not a valid ISO date string.');
	}
};

/** Note that the status-list check is structural only (the list itself is not fetched). */
function adaptStatusList(result: CheckResult): CheckResult {
	return result.status === 'pass'
		? {
				status: 'pass',
				message: `${result.message} (structure only; the status list itself is not fetched.)`
			}
		: result;
}
