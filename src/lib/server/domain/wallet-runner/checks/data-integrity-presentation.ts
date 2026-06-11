import type { WalletCheckCtx, WalletCheckFn } from '../wallet-check.js';

/**
 * Wallet conformance checks for the `data-integrity-cryptosuites` additive on
 * `wallet × credential-presentation` (the verifiablePresentation the wallet sends). Keyed by
 * the additive requirement ids in
 * `src/lib/interop/additive-profiles/data-integrity-cryptosuites/wallet-credential-presentation.ts`.
 */
const PREFIX = 'data-integrity-cryptosuites.wallet.credential-presentation';

const BUNDLE = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'] as const;

const DID_KEY_PREFIX: Record<string, string> = {
	'eddsa-rdfc-2022': 'did:key:z6Mk', // Ed25519
	'ecdsa-rdfc-2019': 'did:key:zDna' // P-256
};

function isSupportedDidMethod(did: string | undefined): boolean {
	return !!did && (did.startsWith('did:key:') || did.startsWith('did:web:'));
}

/** Pull the first embedded VC out of a signed VP (single or array `verifiableCredential`). */
function embeddedCredential(presentation: unknown): unknown {
	const vc = (presentation as { verifiableCredential?: unknown })?.verifiableCredential;
	if (Array.isArray(vc)) return vc[0];
	return vc;
}

export const dataIntegrityPresentationChecks: Record<string, WalletCheckFn> = {
	[`${PREFIX}.producer.vp-cryptosuite-supported`]: (ctx: WalletCheckCtx) => {
		const cs = ctx.holder?.cryptosuite;
		if (!cs) return { status: 'n/a', message: 'No holder cryptosuite recorded for this run.' };
		return BUNDLE.includes(cs)
			? { status: 'pass', message: `VP signed with ${cs}.` }
			: { status: 'fail', message: `VP cryptosuite ${cs} is not in the bundle.` };
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
		if (!did.startsWith('did:key:')) {
			return { status: 'n/a', message: 'Key-type match only inspected for did:key holders.' };
		}
		const expected = DID_KEY_PREFIX[cs];
		return expected && did.startsWith(expected)
			? { status: 'pass', message: `Holder key type matches ${cs}.` }
			: { status: 'fail', message: `Holder did:key prefix does not match ${cs}.` };
	},

	[`${PREFIX}.producer.preserve-vc-proofs`]: (ctx: WalletCheckCtx) => {
		if (ctx.presentation === undefined) {
			return { status: 'n/a', message: 'No presentation was produced.' };
		}
		const embedded = embeddedCredential(ctx.presentation) as { proof?: unknown } | undefined;
		const embeddedProof = embedded?.proof;
		if (embeddedProof === undefined) {
			return { status: 'fail', message: 'Embedded credential is missing its original proof.' };
		}
		const originalProof = (ctx.credential as { proof?: unknown })?.proof;
		// When we have the original credential, the embedded proof must be byte-for-byte identical
		// (the wallet must not re-sign the VC); otherwise pass on presence of a proof.
		if (originalProof !== undefined) {
			return JSON.stringify(embeddedProof) === JSON.stringify(originalProof)
				? { status: 'pass', message: 'Embedded credential proof preserved verbatim.' }
				: { status: 'fail', message: 'Embedded credential proof was altered or re-signed.' };
		}
		return { status: 'pass', message: 'Embedded credential carries a proof.' };
	}
};
