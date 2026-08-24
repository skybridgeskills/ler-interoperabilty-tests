import type { LocallySignedSuite } from './locally-signed-suite.js';
import type { Requirement } from './requirement-schema.js';
import { Scenario } from './scenario-schema.js';

/**
 * The `data-integrity-cryptosuites` issuer **consumer** scenarios — four of
 * them, one per (live protocol × suite).
 *
 * **The axis nobody has ever measured.**
 * `data-integrity-cryptosuites.issuer.credential-issuance.consumer.verify-vp-all`
 * and `…consumer.resolve-holder-dids` had **no registered check** under the
 * checklist model and none under scenarios, so selecting DIC on the old live
 * issuer pages scored neither. M11 and M12 both declined the axis deliberately,
 * because it is entangled with the wallet-side present axis and answering it
 * inside a single-role migration would answer it for one role and retrofit two.
 *
 * **Pinned, but not through the tenant map.** The varied field is
 * `receive-from-issuer.keyProofSuite` — the cryptosuite the *suite's own* test
 * wallet signs its DIDAuthentication VP (VCALM) or `di_vp` key proof (OID4VCI)
 * with. `wallet-crypto` generates that key locally, so it is **always servable**
 * and these scenarios can never render blocked, on any deployment.
 *
 * That is the opposite of M12's wallet *accept* axis, which pins an
 * `IssuingIntent` the transaction service must mint under and which a
 * single-tenant deployment genuinely may not serve. Both are "consumer" axes and
 * they read alike in the catalog; the difference is **who holds the key**, and a
 * later reader who assumes the tenant map is involved here will be wrong.
 *
 * **Live transports only — and this is the one DIC question with no
 * direct-delivery form.** A `direct` intake is a paste: no exchange, no DIDAuth,
 * no `di_vp`, and the action schema already says `'direct'` ignores
 * `keyProofSuite`. Every *other* DIC axis does cover direct delivery — the issuer
 * producer axis ships it (`ob3-direct-issuer-{eddsa,ecdsa}`) and the verifier axis
 * covers it too. The absence here is a property of key proofs, not an omission.
 */

type Suite = 'eddsa' | 'ecdsa';
type Transport = 'vcalm' | 'oid4vci';

const SUITE_NAME: Record<Suite, LocallySignedSuite> = {
	eddsa: 'eddsa-rdfc-2022',
	ecdsa: 'ecdsa-rdfc-2019'
};

const KEY_NAME: Record<Suite, string> = { eddsa: 'Ed25519', ecdsa: 'P-256' };

const PROTOCOL: Record<Transport, string> = { vcalm: 'VCALM', oid4vci: 'OID4VCI' };

/** Which base profile hosts each transport. */
const BASE_PROFILE = { vcalm: 'vcalm', oid4vci: 'oid4' } as const;

/**
 * The requirements for one (transport, suite) pair.
 *
 * Two shared by both transports, plus a third on OID4VCI only — so the two
 * members of a suite pair declare **different requirement ids**. That is legal
 * since M15 dropped the `oneOf` groups and would have broken catalog rule 5
 * before it; it is deliberate rather than an oversight, because VCALM advertises
 * no key-proof algorithm list for the third row to read.
 */
function consumerRequirements(transport: Transport, suite: Suite): Requirement[] {
	const name = SUITE_NAME[suite];
	const proof = transport === 'vcalm' ? 'DIDAuthentication presentation' : '`di_vp` key proof';

	const shared: Requirement[] = [
		{
			id: 'accepted-key-proof',
			statement: `Your issuer accepted our ${proof} signed with \`${name}\`.`,
			level: 'MUST',
			check: { kind: 'automatic', checkId: `issuer-accepted-key-proof-${suite}` }
		},
		{
			id: 'key-proof-suite',
			statement: `We authenticated with a ${KEY_NAME[suite]} key, as \`${name}\` requires.`,
			level: 'MUST',
			check: { kind: 'automatic', checkId: `issuer-key-proof-suite-${suite}` }
		}
	];

	if (transport === 'vcalm') return shared;

	return [
		...shared,
		{
			id: 'advertises-key-proof-suite',
			statement: `Your issuer advertises \`${name}\` for \`di_vp\` key proofs.`,
			level: 'SHOULD',
			check: { kind: 'automatic', checkId: `issuer-advertises-key-proof-${suite}` }
		}
	];
}

/**
 * The instruction, and the honest warning.
 *
 * An issuer that only verifies Ed25519 key proofs **fails** the ECDSA scenario,
 * and that is the measurement rather than a defect in the harness — so the copy
 * says so outright instead of leaving an operator to conclude the run broke.
 */
function summaryFor(transport: Transport, suite: Suite): string {
	const name = SUITE_NAME[suite];
	const handoff =
		transport === 'vcalm'
			? 'create an issuance exchange and paste its interaction URL below. Each exchange is single-use, so a retry needs a fresh URL.'
			: 'publish a pre-authorized-code credential offer and paste the `openid-credential-offer://` URL below.';
	return `We will act as a wallet and collect a credential from your issuer, authenticating with a ${KEY_NAME[suite]} holder key so our key proof is signed with \`${name}\`. Configure your issuer to issue any Open Badges credential, then ${handoff} An issuer that cannot verify \`${name}\` will refuse at that step and nothing will arrive — that is the finding, not a fault in this harness.`;
}

/** The blurb every member carries: this scenario belongs to THIS protocol's add-on badge. */
function blurbFor(transport: Transport, suite: Suite): string {
	return `Check that your issuer can verify a holder key proof signed with ${SUITE_NAME[suite]}, over ${PROTOCOL[transport]}. It counts toward this protocol's Data Integrity Cryptosuites add-on badge; the other protocol has its own.`;
}

function consumerScenario(transport: Transport, suite: Suite) {
	return Scenario({
		slug: `${BASE_PROFILE[transport]}-issuer-consumer-${suite}`,
		name: `Verify an ${suite === 'eddsa' ? 'EdDSA' : 'ECDSA'} key proof over ${PROTOCOL[transport]}`,
		blurb: blurbFor(transport, suite),
		role: 'issuer',
		workflow: 'credential-issuance',
		memberships: [
			{ profile: BASE_PROFILE[transport], level: 'additive-only' },
			{ profile: 'data-integrity-cryptosuites', level: 'required' }
		],
		steps: [
			{
				id: 'receive',
				title: `Issue to a wallet holding a ${KEY_NAME[suite]} key`,
				summary: summaryFor(transport, suite),
				action: {
					kind: 'receive-from-issuer',
					transport,
					keyProofSuite: SUITE_NAME[suite]
				},
				requirements: consumerRequirements(transport, suite)
			}
		]
	});
}

export const vcalmIssuerConsumerEddsa = consumerScenario('vcalm', 'eddsa');
export const oid4IssuerConsumerEddsa = consumerScenario('oid4vci', 'eddsa');
export const vcalmIssuerConsumerEcdsa = consumerScenario('vcalm', 'ecdsa');
export const oid4IssuerConsumerEcdsa = consumerScenario('oid4vci', 'ecdsa');
