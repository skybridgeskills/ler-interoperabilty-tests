import type { LocallySignedSuite } from './locally-signed-suite.js';
import { Scenario, type ScenarioStep } from './scenario-schema.js';

/**
 * The `data-integrity-cryptosuites` **verifier** scenarios — six of them, one per
 * (transport × suite).
 *
 * **The verifier had no additive axis at all until M15**, which was conspicuous:
 * it is the purest consumer of proofs in the catalog, and the one role whose
 * whole job is deciding whether a signature holds.
 *
 * **Discrimination, not acceptance.** The question is not *"does your verifier
 * accept an ECDSA credential"* but *"does your verifier tell a good ECDSA
 * credential from a bad one"*. A verifier that accepts everything passes the
 * first and fails the second, and the second is the one worth measuring. So each
 * scenario is two shuffled passes — one valid, one whose proof was corrupted
 * after signing — following `ob3-direct-verifier-acceptance`'s shape exactly.
 *
 * **Two passes, not four.** The base verifier scenarios carry four, adding a
 * schema-invalid and an expired credential. Those two defects are
 * **suite-independent** — an expired credential is expired whichever cryptosuite
 * signed it — so repeating them per suite would double the operator's work and
 * measure nothing new. They stay on the base scenario deliberately.
 *
 * **Locally signed, so never blocked.** The suite signs what it hands over, with
 * keys `wallet-crypto` generates on demand, so `cryptosuite` here is a
 * {@link LocallySignedSuite} and not an `IssuingIntent`. These scenarios render
 * on every deployment. Before M15 P2 they could not have been authored at all:
 * `present-to-verifier` had no cryptosuite field, and `deliver-direct` routed its
 * suite through the tenant map.
 *
 * **Presentations only where the transport has them.** Direct delivery is a file
 * the operator moves out of band — there is no presentation to make — so its two
 * scenarios hand over a credential and nothing else. VCALM and OID4VP present.
 */

type Suite = 'eddsa' | 'ecdsa';
type Transport = 'direct' | 'vcalm' | 'oid4vp';

const SUITE_NAME: Record<Suite, LocallySignedSuite> = {
	eddsa: 'eddsa-rdfc-2022',
	ecdsa: 'ecdsa-rdfc-2019'
};

const SUITE_LABEL: Record<Suite, string> = { eddsa: 'EdDSA', ecdsa: 'ECDSA' };

const PROTOCOL: Record<Transport, string> = {
	direct: 'a direct hand-off',
	vcalm: 'VCALM',
	oid4vp: 'OID4VP'
};

/** Which base profile hosts each transport, and which workflow it registers under. */
const HOST = {
	direct: { profile: 'ob3-direct-delivery', workflow: 'direct-credential-verification' },
	vcalm: { profile: 'vcalm', workflow: 'credential-request-and-verification' },
	oid4vp: { profile: 'oid4', workflow: 'credential-request-and-verification' }
} as const;

/** The action for one pass — a hand-off for `direct`, a live presentation otherwise. */
function actionFor(transport: Transport, suite: Suite, tamper?: 'proof'): ScenarioStep['action'] {
	const cryptosuite = SUITE_NAME[suite];
	if (transport === 'direct') {
		return {
			kind: 'deliver-direct',
			credential: 'minimal-ob3',
			cryptosuite,
			...(tamper ? { tamper } : {})
		};
	}
	return {
		kind: 'present-to-verifier',
		credential: 'minimal-ob3',
		transport,
		cryptosuite,
		...(tamper ? { tamper } : {})
	};
}

/**
 * One pass — the same verdict/reason pair the base verifier scenarios use.
 *
 * Both passes carry the **identical requirement shape**, so which credential is
 * which cannot be learned from the questions; only the concealed right answers
 * differ. The `reason` options are the base scenario's, minus nothing: `schema`
 * and `expiry` stay on offer even though neither is ever correct here, because
 * removing them would narrow the guess and tell the operator what kind of defect
 * to expect.
 */
function pass(
	id: string,
	action: ScenarioStep['action'],
	setup: string,
	verdict: 'accepted' | 'rejected',
	reason: 'none' | 'signature'
): ScenarioStep {
	return {
		id,
		// Never rendered for a shuffled step — the page shows `${shuffleLabel} ${n}`.
		title: `Hand over the ${id} credential`,
		summary: setup,
		action,
		shuffle: true,
		requirements: [
			{
				id: `${id}-verdict`,
				statement: 'What did your verifier decide about this credential?',
				level: 'MUST',
				check: {
					kind: 'attested',
					answer: {
						kind: 'choose',
						options: [
							{ value: 'accepted', label: 'Accepted it' },
							{ value: 'rejected', label: 'Rejected it' }
						],
						correct: verdict
					}
				}
			},
			{
				id: `${id}-reason`,
				statement: 'What problem did your verifier report about it, if any?',
				level: 'SHOULD',
				check: {
					kind: 'attested',
					answer: {
						kind: 'choose',
						options: [
							{ value: 'none', label: 'No problem — it accepted the credential' },
							{ value: 'signature', label: 'The signature did not verify' },
							{ value: 'schema', label: 'It failed schema validation' },
							{ value: 'expiry', label: 'It was expired' },
							{ value: 'other', label: 'Some other problem' }
						],
						correct: reason
					}
				}
			}
		]
	};
}

function discriminationScenario(transport: Transport, suite: Suite) {
	const host = HOST[transport];
	const name = SUITE_NAME[suite];
	const carrier = transport === 'direct' ? 'credential' : 'presentation';

	return Scenario({
		slug: `${host.profile === 'ob3-direct-delivery' ? 'ob3-direct' : host.profile}-verifier-${suite}`,
		name: `Tell a good ${SUITE_LABEL[suite]} credential from a bad one — over ${PROTOCOL[transport]}`,
		blurb: `Two credentials signed with ${name}, in a random order — one valid, one whose proof was corrupted. Report what your verifier decided about each. It counts toward this protocol's Data Integrity Cryptosuites add-on badge; the other protocols have their own.`,
		role: 'verifier',
		workflow: host.workflow,
		memberships: [
			{ profile: host.profile, level: 'additive-only' },
			{ profile: 'data-integrity-cryptosuites', level: 'required' }
		],
		shuffleLabel: 'Credential',
		steps: [
			pass(
				'valid',
				actionFor(transport, suite),
				`A well-formed Open Badges 3.0 credential signed with \`${name}\`. Everything about this one is correct — a verifier that supports the cryptosuite should accept it, and one that does not will reject a perfectly good credential, which is the measurement.`,
				'accepted',
				'none'
			),
			pass(
				'broken-signature',
				actionFor(transport, suite, 'proof'),
				`An Open Badges credential signed with \`${name}\` whose cryptographic proof was corrupted after signing. Everything else about it is well-formed, so only a verifier that actually checks the ${name} signature will catch it.`,
				'rejected',
				'signature'
			)
		]
	});
}

export const ob3DirectVerifierEddsa = discriminationScenario('direct', 'eddsa');
export const vcalmVerifierEddsa = discriminationScenario('vcalm', 'eddsa');
export const oid4VerifierEddsa = discriminationScenario('oid4vp', 'eddsa');
export const ob3DirectVerifierEcdsa = discriminationScenario('direct', 'ecdsa');
export const vcalmVerifierEcdsa = discriminationScenario('vcalm', 'ecdsa');
export const oid4VerifierEcdsa = discriminationScenario('oid4vp', 'ecdsa');
