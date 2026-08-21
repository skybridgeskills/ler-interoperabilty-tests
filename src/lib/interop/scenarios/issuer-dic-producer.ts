import type { Requirement } from './requirement-schema.js';
import { Scenario } from './scenario-schema.js';
import type { ScenarioAction } from './scenario-schema.js';

/**
 * The `data-integrity-cryptosuites` **producer** scenarios — six of them, in two
 * cross-protocol `oneOf` groups.
 *
 * **The model, and why it is not the brief's.** The producer *floor* — "your
 * issuer signs with a cryptosuite we can verify" — is already a `required` row
 * on each base scenario (`credential-di-proof-bundle` on the live pages,
 * `credential-di-proof-eddsa` on the direct one). Nothing more is needed there,
 * so `oneOf` is free to express something better: **protocol breadth inside the
 * additive**. EdDSA over VCALM and EdDSA over OID4VCI complete the same EdDSA
 * item. DIC's issuer card therefore carries **two** obligations — EdDSA and
 * ECDSA — each satisfiable by any one protocol, so as few as two runs fill it,
 * not six.
 *
 * **Not new measurement.** `producer.cryptosuite-supported` and the base
 * `di-proof` rows already assert exactly this; M11 decomposes them so the meter
 * is honest about *which* suite was proven. Three DIC ids are deliberately
 * dropped and two deferred — see `mapping.md` § 4.
 *
 * Each scenario is **`additive-only`** in its base profile: the base names it
 * because that protocol is what it runs over, and claims none of it. An additive
 * scenario must never enlarge the base meters or make either base badge harder
 * to earn — and `optional` would, because under the two-tier model it is the
 * profile's Expanded set and counts toward Complete, which would make "a
 * complete OID4 issuer" quietly mean "…and supports both cryptosuites".
 */

/** The two requirements every member of both groups declares — ids identical, per catalog rule 5. */
function producerRequirements(suite: 'eddsa' | 'ecdsa'): Requirement[] {
	return [
		{
			id: 'cryptosuite',
			statement:
				suite === 'eddsa'
					? 'Your issuer signed the credential with `eddsa-rdfc-2022`.'
					: 'Your issuer signed the credential with `ecdsa-rdfc-2019`.',
			level: 'MUST',
			check: {
				kind: 'automatic',
				checkId: suite === 'eddsa' ? 'credential-di-proof-eddsa' : 'credential-di-proof-ecdsa'
			}
		},
		{
			id: 'issuer-did-method',
			statement: 'Your issuer is identified by a `did:web` or `did:key` DID.',
			level: 'MUST',
			check: { kind: 'automatic', checkId: 'credential-issuer-did-method' }
		}
	];
}

/** The whole instruction: configure your issuer to sign with this suite, then deliver over this transport. */
function summaryFor(suite: 'eddsa' | 'ecdsa', delivery: string): string {
	const name = suite === 'eddsa' ? '`eddsa-rdfc-2022`' : '`ecdsa-rdfc-2019`';
	return `Configure your issuer to sign with ${name}, then ${delivery} We read the cryptosuite off the credential's proof — the suite is yours to choose, and this is the whole of what the scenario asks.`;
}

/** The blurb every member carries, so nobody reads six scenarios as six obligations. */
function blurbFor(suite: 'eddsa' | 'ecdsa', protocol: string): string {
	const name = suite === 'eddsa' ? 'eddsa-rdfc-2022' : 'ecdsa-rdfc-2019';
	return `Sign a credential with ${name} and deliver it over ${protocol}. Passing either cryptosuite over any one protocol completes that cryptosuite's item — you do not need to run all six.`;
}

const DIRECT_ACTION: ScenarioAction = { kind: 'receive-from-issuer', transport: 'direct' };
const VCALM_ACTION: ScenarioAction = {
	kind: 'receive-from-issuer',
	transport: 'vcalm',
	keyProofSuite: 'eddsa-rdfc-2022'
};
const OID4_ACTION: ScenarioAction = {
	kind: 'receive-from-issuer',
	transport: 'oid4vci',
	keyProofSuite: 'eddsa-rdfc-2022'
};

/**
 * `keyProofSuite` stays `eddsa-rdfc-2022` on every one of these, including the
 * ECDSA members. It is the **suite's own** holder key proof and is not what is
 * under test — the credential's proof is. The consumer axis (does your issuer
 * verify our key proof in each suite?) is the M15 sibling effort's.
 */
export const ob3DirectIssuerEddsa = Scenario({
	slug: 'ob3-direct-issuer-eddsa',
	name: 'Sign with EdDSA and deliver directly',
	blurb: blurbFor('eddsa', 'a direct paste'),
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	memberships: [
		{ profile: 'ob3-direct-delivery', level: 'additive-only' },
		{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'dic-issuer-eddsa' } }
	],
	steps: [
		{
			id: 'deliver',
			title: 'Issue an EdDSA-signed credential and paste it here',
			summary: summaryFor('eddsa', 'issue a credential and paste it below.'),
			action: DIRECT_ACTION,
			requirements: producerRequirements('eddsa')
		}
	]
});

export const vcalmIssuerEddsa = Scenario({
	slug: 'vcalm-issuer-eddsa',
	name: 'Sign with EdDSA and issue over VCALM',
	blurb: blurbFor('eddsa', 'VCALM'),
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'vcalm', level: 'additive-only' },
		{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'dic-issuer-eddsa' } }
	],
	steps: [
		{
			id: 'issue',
			title: 'Issue an EdDSA-signed credential over a VC-API exchange',
			summary: summaryFor(
				'eddsa',
				'create an issuance exchange and paste its interaction URL below. Each exchange is single-use, so a retry needs a fresh URL.'
			),
			action: VCALM_ACTION,
			requirements: producerRequirements('eddsa')
		}
	]
});

export const oid4IssuerEddsa = Scenario({
	slug: 'oid4-issuer-eddsa',
	name: 'Sign with EdDSA and issue over OID4VCI',
	blurb: blurbFor('eddsa', 'OID4VCI'),
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'oid4', level: 'additive-only' },
		{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'dic-issuer-eddsa' } }
	],
	steps: [
		{
			id: 'issue',
			title: 'Issue an EdDSA-signed credential over OID4VCI',
			summary: summaryFor(
				'eddsa',
				'publish a pre-authorized-code credential offer for it and paste the `openid-credential-offer://` URL below.'
			),
			action: OID4_ACTION,
			requirements: producerRequirements('eddsa')
		}
	]
});

export const ob3DirectIssuerEcdsa = Scenario({
	slug: 'ob3-direct-issuer-ecdsa',
	name: 'Sign with ECDSA and deliver directly',
	blurb: blurbFor('ecdsa', 'a direct paste'),
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	memberships: [
		{ profile: 'ob3-direct-delivery', level: 'additive-only' },
		{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'dic-issuer-ecdsa' } }
	],
	steps: [
		{
			id: 'deliver',
			title: 'Issue an ECDSA-signed credential and paste it here',
			summary: summaryFor('ecdsa', 'issue a credential and paste it below.'),
			action: DIRECT_ACTION,
			requirements: producerRequirements('ecdsa')
		}
	]
});

export const vcalmIssuerEcdsa = Scenario({
	slug: 'vcalm-issuer-ecdsa',
	name: 'Sign with ECDSA and issue over VCALM',
	blurb: blurbFor('ecdsa', 'VCALM'),
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'vcalm', level: 'additive-only' },
		{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'dic-issuer-ecdsa' } }
	],
	steps: [
		{
			id: 'issue',
			title: 'Issue an ECDSA-signed credential over a VC-API exchange',
			summary: summaryFor(
				'ecdsa',
				'create an issuance exchange and paste its interaction URL below. Each exchange is single-use, so a retry needs a fresh URL.'
			),
			action: VCALM_ACTION,
			requirements: producerRequirements('ecdsa')
		}
	]
});

export const oid4IssuerEcdsa = Scenario({
	slug: 'oid4-issuer-ecdsa',
	name: 'Sign with ECDSA and issue over OID4VCI',
	blurb: blurbFor('ecdsa', 'OID4VCI'),
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [
		{ profile: 'oid4', level: 'additive-only' },
		{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'dic-issuer-ecdsa' } }
	],
	steps: [
		{
			id: 'issue',
			title: 'Issue an ECDSA-signed credential over OID4VCI',
			summary: summaryFor(
				'ecdsa',
				'publish a pre-authorized-code credential offer for it and paste the `openid-credential-offer://` URL below.'
			),
			action: OID4_ACTION,
			requirements: producerRequirements('ecdsa')
		}
	]
});
