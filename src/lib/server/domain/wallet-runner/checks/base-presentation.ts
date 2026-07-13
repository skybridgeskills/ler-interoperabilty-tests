import { vpProofOf } from '../verify-exchange-context.js';
import type { WalletCheckCtx, WalletCheckFn } from '../wallet-check.js';

/**
 * Black-box wallet checks for the base `wallet × credential-presentation` MUSTs
 * that carry stable ids, derived from the observed `verify` exchange (echoed VP
 * + verifier-core verdict). Keyed by the ids added in
 * `src/lib/interop/profiles/{oid4,vcalm}/wallet-credential-presentation.ts`.
 *
 * Requirements without a registered id here (consent UI, presentation interface,
 * TLS, empty-POST) stay `n/a` via the exchange-checker fallback — they are not
 * per-wallet observable, and `n/a` never fails `verified`.
 */

const NO_PRESENTATION = 'No verifiablePresentation was observed on the exchange.';

/** The read `variables.oid4vp` shape used to confirm `direct_post` delivery. */
function oid4vpOf(ctx: WalletCheckCtx): { responseReceived?: boolean } | undefined {
	const v = ctx.exchange.variables?.oid4vp;
	return v && typeof v === 'object' ? (v as { responseReceived?: boolean }) : undefined;
}

/** The request `client_id`/`domain` the verifier bound the presentation to, when echoed. */
function requestDomainOf(ctx: WalletCheckCtx): string | undefined {
	const v = ctx.exchange.variables;
	const candidate = (v?.oid4vp as { clientId?: unknown })?.clientId ?? v?.clientId ?? v?.domain;
	return typeof candidate === 'string' ? candidate : undefined;
}

/** VP is a Data Integrity (`ldp_vp`) presentation object, not a compact JWT VP. */
const diVpNotJwt: WalletCheckFn = (ctx) => {
	const vp = ctx.presentation;
	if (vp === undefined) return { status: 'n/a', message: NO_PRESENTATION };
	if (typeof vp === 'string') {
		return {
			status: 'fail',
			message: 'VP is a compact JWT string, not a Data Integrity presentation.'
		};
	}
	const type = vpProofOf(vp)?.type;
	return type === 'DataIntegrityProof'
		? { status: 'pass', message: 'VP is a Data Integrity (ldp_vp) presentation.' }
		: {
				status: 'fail',
				message: `VP proof.type is ${String(type ?? 'absent')}, expected DataIntegrityProof.`
			};
};

/** VP proof cryptographically verifies (verifier-core's `results.default.verified`). */
const vpSignatureValid: WalletCheckFn = (ctx) => {
	if (ctx.presentation === undefined) return { status: 'n/a', message: NO_PRESENTATION };
	return ctx.verify.verified
		? { status: 'pass', message: 'Verifier-core verified the VP proof against the holder key.' }
		: { status: 'fail', message: 'Verifier-core did not verify the VP proof.' };
};

/**
 * VP proof is bound to the request: `challenge` (nonce) is present and non-empty;
 * `domain` (audience) equals the request `client_id` when the exchange echoes one,
 * otherwise its presence + verifier-core's verdict (which enforced the binding) stand in.
 */
const proofBinding: WalletCheckFn = (ctx) => {
	const vp = ctx.presentation;
	if (vp === undefined) return { status: 'n/a', message: NO_PRESENTATION };
	const proof = vpProofOf(vp);
	const challenge = proof?.challenge;
	if (typeof challenge !== 'string' || challenge.length === 0) {
		return { status: 'fail', message: 'VP proof is missing a challenge/nonce binding.' };
	}
	const domain = typeof proof?.domain === 'string' ? (proof.domain as string) : undefined;
	const expected = requestDomainOf(ctx);
	if (expected) {
		return domain === expected
			? { status: 'pass', message: 'VP proof challenge + domain bound to the request.' }
			: {
					status: 'fail',
					message: `VP proof domain ${String(domain ?? 'absent')} does not match request ${expected}.`
				};
	}
	if (!domain) {
		return {
			status: 'warn',
			message: 'VP proof carries a challenge but no domain (challenge-only binding).'
		};
	}
	return ctx.verify.verified
		? {
				status: 'pass',
				message: 'VP proof challenge + domain present; verifier-core enforced the binding.'
			}
		: { status: 'fail', message: 'VP proof binding present but verifier-core did not verify it.' };
};

/** `vp_token` was delivered (OID4VP `responseReceived`, or the exchange advanced past `pending`). */
const vpDelivered: WalletCheckFn = (ctx) => {
	const oid4vp = oid4vpOf(ctx);
	if (oid4vp) {
		return oid4vp.responseReceived
			? { status: 'pass', message: 'vp_token delivered via direct_post (responseReceived).' }
			: { status: 'fail', message: 'No vp_token delivery recorded (responseReceived is false).' };
	}
	const delivered = ctx.exchange.state !== 'pending' || ctx.presentation !== undefined;
	return delivered
		? { status: 'pass', message: 'Presentation delivered (exchange advanced past pending).' }
		: { status: 'n/a', message: 'No presentation delivery observed yet.' };
};

export const basePresentationChecks: Record<string, WalletCheckFn> = {
	'oid4.wallet.credential-presentation.di-vp-not-jwt': diVpNotJwt,
	'oid4.wallet.credential-presentation.vp-signature-valid': vpSignatureValid,
	'oid4.wallet.credential-presentation.proof-binding': proofBinding,
	'oid4.wallet.credential-presentation.vp-delivered': vpDelivered,
	'vcalm.wallet.credential-presentation.proof-binding': proofBinding
};
