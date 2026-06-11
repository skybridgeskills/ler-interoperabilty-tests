import type { WalletCheckCtx, WalletCheckFn } from '../wallet-check.js';

/**
 * Wallet conformance checks for the `data-integrity-cryptosuites` additive on
 * `wallet × credential-acceptance`. These are protocol-agnostic (the cryptosuite/DID/proof
 * assertions hold for VCALM and OID4VCI alike), so both M3 and M4 register this set.
 *
 * Keyed by the additive requirement ids in
 * `src/lib/interop/additive-profiles/data-integrity-cryptosuites/wallet-credential-acceptance.ts`.
 */
const PREFIX = 'data-integrity-cryptosuites.wallet.credential-acceptance';

const BUNDLE = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'] as const;

/** Multibase prefix expected on a did:key for each cryptosuite's key type. */
const DID_KEY_PREFIX: Record<string, string> = {
	'eddsa-rdfc-2022': 'did:key:z6Mk', // Ed25519
	'ecdsa-rdfc-2019': 'did:key:zDna' // P-256
};

function isSupportedDidMethod(did: string | undefined): boolean {
	return !!did && (did.startsWith('did:key:') || did.startsWith('did:web:'));
}

export const dataIntegrityAcceptanceChecks: Record<string, WalletCheckFn> = {
	[`${PREFIX}.producer.vp-cryptosuite-supported`]: (ctx: WalletCheckCtx) => {
		const cs = ctx.holder?.cryptosuite;
		if (!cs) return { status: 'n/a', message: 'No holder cryptosuite recorded for this run.' };
		return BUNDLE.includes(cs)
			? { status: 'pass', message: `Holder signed the DID-auth VP with ${cs}.` }
			: { status: 'fail', message: `Holder cryptosuite ${cs} is not in the bundle.` };
	},

	[`${PREFIX}.producer.holder-did-method`]: (ctx: WalletCheckCtx) => {
		const did = ctx.holder?.did;
		if (!did) return { status: 'n/a', message: 'No holder DID recorded for this run.' };
		return isSupportedDidMethod(did)
			? { status: 'pass', message: `Holder DID uses a supported method: ${did}.` }
			: { status: 'fail', message: `Holder DID is not did:key/did:web: ${did}.` };
	},

	[`${PREFIX}.producer.key-type-matches`]: (ctx: WalletCheckCtx) => {
		const cs = ctx.holder?.cryptosuite;
		const did = ctx.holder?.did;
		if (!cs || !did) return { status: 'n/a', message: 'No holder key recorded for this run.' };
		const expected = DID_KEY_PREFIX[cs];
		if (!did.startsWith('did:key:')) {
			return { status: 'n/a', message: 'Key-type match only inspected for did:key holders.' };
		}
		return expected && did.startsWith(expected)
			? { status: 'pass', message: `Holder key type matches ${cs}.` }
			: { status: 'fail', message: `Holder did:key prefix does not match ${cs}.` };
	},

	[`${PREFIX}.consumer.verify-vc-all`]: (ctx: WalletCheckCtx) => {
		if (ctx.credential === undefined) {
			return { status: 'fail', message: 'No issued credential was received to verify.' };
		}
		return ctx.verify.verified
			? {
					status: 'pass',
					message: `Issued credential verified (${ctx.verify.cryptosuite ?? 'unknown suite'}).`
				}
			: {
					status: 'fail',
					message: `Issued credential failed verification: ${ctx.verify.errors?.join('; ') || 'unknown error'}.`
				};
	},

	[`${PREFIX}.consumer.resolve-issuer-dids`]: (ctx: WalletCheckCtx) => {
		if (!ctx.verify.issuerDid) {
			return { status: 'n/a', message: 'No issuer DID present on the received credential.' };
		}
		// Verification resolves the issuer DID to its verification method; a verified proof
		// implies the issuer DID + key resolved.
		return ctx.verify.verified && isSupportedDidMethod(ctx.verify.issuerDid)
			? { status: 'pass', message: `Resolved issuer DID ${ctx.verify.issuerDid}.` }
			: { status: 'fail', message: `Could not resolve issuer DID ${ctx.verify.issuerDid}.` };
	}
};
