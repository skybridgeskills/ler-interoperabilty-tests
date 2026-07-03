import {
	issuerDidMethodCheck,
	ob3DirectDeliveryIssuerChecks,
	subjectOf,
	type CheckCtx,
	type CheckResult
} from '$lib/server/domain/issuer-runner/checks/ob3-direct-delivery-issuer.js';

import type { IssuerFlowCheckCtx, IssuerFlowCheckFn } from '../issuer-flow-check.js';

/**
 * Issuer-flow conformance checks, keyed by the `vcalm.issuer.credential-issuance.*` requirement
 * ids on the base issuer VCALM checklist. Each reads the observations from `runIssuerFlow` and
 * returns `undefined` until its step has run (rendered as *pending*). Step-4 credential checks
 * reuse the OB 3.0 issuer check logic (`ob3-direct-delivery-issuer.ts`).
 */
const P = 'vcalm.issuer.credential-issuance.';

const CRYPTOSUITE_BUNDLE = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

const pass = (message: string): CheckResult => ({ status: 'pass', message });
const fail = (message: string): CheckResult => ({ status: 'fail', message });

/** Adapt issuer-flow observations into the OB3 issuer `CheckCtx` (credential-only checks). */
export function credCtx(ctx: IssuerFlowCheckCtx): CheckCtx {
	return {
		credential: ctx.delivery?.credential,
		verifierResult: { verified: !!ctx.verify?.verified },
		includeAdditive: false
	};
}

/** Whether a VPR `query` (object or array) declares a DIDAuthentication query. */
function queryHasDidAuth(query: unknown): boolean {
	const isDidAuth = (q: unknown) =>
		!!q && typeof q === 'object' && (q as { type?: unknown }).type === 'DIDAuthentication';
	return Array.isArray(query) ? query.some(isDidAuth) : isDidAuth(query);
}

export const vcalmIssuerFlowChecks: Record<string, IssuerFlowCheckFn> = {
	[`${P}interaction-url-fetchable`]: (ctx) => {
		const i = ctx.interaction;
		if (!i) return undefined;
		return i.ok && i.protocols
			? pass('Interaction URL is fetchable and returned VCALM interaction protocols.')
			: fail(i.error ?? `Interaction URL responded ${i.status}.`);
	},

	[`${P}participation-endpoint`]: (ctx) => {
		const i = ctx.interaction;
		if (!i) return undefined;
		return i.ok && i.protocols
			? pass('Exchange-participation endpoint responded with an interaction-protocols object.')
			: fail(i.error ?? `Participation endpoint responded ${i.status}.`);
	},

	[`${P}tls`]: (ctx) => {
		const i = ctx.interaction;
		if (!i) return undefined;
		if (!i.tls) return fail('Endpoint is not served over HTTPS (TLS 1.2+ required).');
		return i.tls.atLeastTls12
			? pass(`Endpoint negotiated ${i.tls.protocol}.`)
			: fail(
					i.tls.error ?? `Endpoint TLS version (${i.tls.protocol ?? 'unknown'}) is below TLS 1.2.`
				);
	},

	[`${P}participation-problemdetails`]: (ctx) =>
		ctx.interaction
			? {
					status: 'n/a',
					message:
						'ProblemDetails error handling is not automatically checked on the happy path (needs a negative probe).'
				}
			: undefined,

	[`${P}vcapi-in-protocols`]: (ctx) => {
		const i = ctx.interaction;
		if (!i) return undefined;
		return i.vcapiUrl
			? pass(`Interaction protocols include a \`vcapi\` URL: ${i.vcapiUrl}.`)
			: fail('Interaction protocols did not include an absolute `vcapi` URL.');
	},

	[`${P}didauth-requested`]: (ctx) => {
		const d = ctx.didAuth;
		if (!d) return undefined;
		const query = (d.vpr as { query?: unknown } | undefined)?.query;
		if (d.challenge && queryHasDidAuth(query)) {
			return pass('Empty POST returned a DIDAuthentication request with a challenge.');
		}
		if (d.challenge) {
			return {
				status: 'warn',
				message:
					'A challenge was returned, but no explicit DIDAuthentication query was found in the VPR.'
			};
		}
		return fail(d.error ?? 'No DIDAuthentication challenge was returned.');
	},

	[`${P}didauth-problemdetails`]: (ctx) =>
		ctx.didAuth
			? {
					status: 'n/a',
					message:
						'ProblemDetails error handling is not automatically checked on the happy path (needs a negative probe).'
				}
			: undefined,

	[`${P}binds-verified-holder`]: (ctx) => {
		const del = ctx.delivery;
		if (!del) return undefined;
		if (del.credential === undefined) {
			return fail(del.error ?? 'No credential was issued after DID authentication.');
		}
		const subjectId = subjectOf(del.credential)?.id;
		return ctx.holder?.did && subjectId === ctx.holder.did
			? pass('Issued credential is bound to the authenticated holder DID.')
			: fail(
					`credentialSubject.id (${typeof subjectId === 'string' ? subjectId : 'missing'}) does not match the authenticated holder DID.`
				);
	},

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
