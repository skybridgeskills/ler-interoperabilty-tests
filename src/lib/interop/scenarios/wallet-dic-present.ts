import type { Requirement } from './requirement-schema.js';
import { Scenario } from './scenario-schema.js';

/**
 * The `data-integrity-cryptosuites` wallet **producer** scenarios — four of
 * them, in two `oneOf` groups of two.
 *
 * **Observed, not pinned.** The suite is the verifier here: it asks, the wallet
 * answers, and the key the wallet signs with is the wallet's own. Nothing in the
 * request can choose it, so the scenario cannot demand a cryptosuite — it can
 * only read the one that arrived. That is exactly M11's finding for issuers, and
 * it is the half of this milestone's DIC work that needs no tenant map at all.
 *
 * The **consumer** half is the opposite and sits in `wallet-dic-accept.ts`: the
 * suite mints the credential there, so it really can pin a cryptosuite, and it
 * does. Two axes, one additive profile, and the asymmetry between them is the
 * whole content of the pair — read both files together or neither makes sense.
 *
 * Each scenario is **`additive-only`** in its base profile: the base names it
 * because that protocol is what it runs over, and claims none of it. `optional`
 * would be wrong — that is the base profile's Expanded tier, and Complete is
 * cumulative, so it would make "a complete OID4 wallet" quietly mean "…and
 * supports both cryptosuites". See
 * `docs/adr/2026-08-21-additive-requirements-as-memberships.md`.
 *
 * The DIC `producer.preserve-vc-proofs` row is **not** here. The base
 * presentation scenarios carry it as `preserve-proofs`, because both base
 * profiles declare it as a MUST of their own — see `mapping.md` § 5.
 */

type Suite = 'eddsa' | 'ecdsa';
type Protocol = 'oid4' | 'vcalm';

const SUITE_NAME: Record<Suite, string> = {
	eddsa: 'eddsa-rdfc-2022',
	ecdsa: 'ecdsa-rdfc-2019'
};

const KEY_NAME: Record<Suite, string> = { eddsa: 'Ed25519', ecdsa: 'P-256' };

const TRANSPORT: Record<Protocol, string> = { oid4: 'OID4VP', vcalm: 'VCALM' };

/**
 * The three requirements every member of a group declares — ids identical
 * across the group, per catalog rule 5, with only the checks varying by suite.
 *
 * `key-type-matches` is **kept**, unlike M11's dropped issuer analogue: the
 * wallet check reads the key type straight off the holder `did:key`'s multibase
 * prefix, so it needs no DID resolution and is genuinely runnable.
 */
function producerRequirements(suite: Suite): Requirement[] {
	return [
		{
			id: 'vp-cryptosuite',
			statement: `Your wallet signed the presentation with \`${SUITE_NAME[suite]}\`.`,
			level: 'MUST',
			check: { kind: 'automatic', checkId: `wallet-vp-cryptosuite-${suite}` }
		},
		{
			id: 'holder-did-method',
			statement: 'Your wallet identified itself with a `did:key` or `did:web` DID.',
			level: 'MUST',
			check: { kind: 'automatic', checkId: 'wallet-holder-did-method' }
		},
		{
			id: 'key-type-matches',
			statement: `The holder key your wallet signed with is a ${KEY_NAME[suite]} key.`,
			level: 'MUST',
			check: { kind: 'automatic', checkId: `wallet-holder-key-type-${suite}` }
		}
	];
}

/**
 * The instruction, and the honest warning that goes with it.
 *
 * A wallet holding only an Ed25519 key **fails** the ECDSA scenario, and that is
 * the measurement rather than a defect in the harness — so the copy says it
 * outright rather than leaving an operator to conclude the run broke.
 */
function summaryFor(suite: Suite, protocol: Protocol): string {
	return `We will ask your wallet for any Open Badges credential you hold, over ${TRANSPORT[protocol]}. Present it using a ${KEY_NAME[suite]} holder key, so the presentation is signed with \`${SUITE_NAME[suite]}\` — most wallets choose this in their key or DID settings. We read the cryptosuite off the presentation that arrives; a wallet that holds no ${KEY_NAME[suite]} key will fail this scenario, and that is the answer, not a fault.`;
}

/** The blurb every member carries, so four scenarios do not read as four obligations. */
function blurbFor(suite: Suite, protocol: Protocol): string {
	return `Present a credential over ${TRANSPORT[protocol]} signed with ${SUITE_NAME[suite]}. Passing over either protocol completes that cryptosuite's item — you do not need to run both.`;
}

function presentScenario(protocol: Protocol, suite: Suite) {
	return Scenario({
		slug: `${protocol}-wallet-present-${suite}`,
		name: `Present with ${suite === 'eddsa' ? 'EdDSA' : 'ECDSA'} over ${TRANSPORT[protocol]}`,
		blurb: blurbFor(suite, protocol),
		role: 'wallet',
		workflow: 'credential-presentation',
		memberships: [
			{ profile: protocol, level: 'additive-only' },
			{ profile: 'data-integrity-cryptosuites', level: { oneOf: `dic-wallet-present-${suite}` } }
		],
		steps: [
			{
				id: 'present',
				title: `Present with a ${KEY_NAME[suite]} key`,
				summary: summaryFor(suite, protocol),
				action: { kind: 'request-presentation', request: 'ob3-any' },
				requirements: producerRequirements(suite)
			}
		]
	});
}

export const oid4WalletPresentEddsa = presentScenario('oid4', 'eddsa');
export const vcalmWalletPresentEddsa = presentScenario('vcalm', 'eddsa');
export const oid4WalletPresentEcdsa = presentScenario('oid4', 'ecdsa');
export const vcalmWalletPresentEcdsa = presentScenario('vcalm', 'ecdsa');
