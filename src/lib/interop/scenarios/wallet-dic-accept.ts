import type { Requirement } from './requirement-schema.js';
import { Scenario } from './scenario-schema.js';

/**
 * The `data-integrity-cryptosuites` wallet **consumer** scenarios — four of
 * them, one per (protocol × suite), and **the first scenarios in the catalog to
 * pin an `IssuingIntent`.**
 *
 * **Each belongs to its own protocol's add-on badge.** M12 shipped these in two
 * cross-protocol `oneOf` groups; M15 re-keyed the add-on badge to
 * `(additive, base profile, role)` and the groups went with it.
 *
 * **Pinned, not observed.** The question here is *can your wallet verify this*,
 * and that cannot be asked by watching: a wallet that only ever meets EdDSA
 * credentials tells you nothing about its ECDSA support by accepting one. So the
 * suite mints the credential itself, in the suite under test, and asks the
 * operator what their wallet made of it. The producer half
 * (`wallet-dic-present.ts`) is the mirror image and is *observed*, because there
 * the wallet holds the key and we only get to read what arrives. Neither file
 * explains the milestone on its own.
 *
 * **Pinning is a tenant swap.** `resolveIssuingContext` answers whether this
 * deployment has a tenant advertising the pinned `(cryptosuite, didMethod)`; a
 * deployment with only the default tenant renders these scenarios disabled with
 * a typed reason, **keeps their requirements in the completion denominator**,
 * and cannot claim the DIC wallet badge. That is the intended behaviour on a
 * single-tenant deployment, not a misconfiguration. See
 * `docs/adr/2026-08-22-pinned-issuing-through-a-tenant-map.md`.
 *
 * `didMethod` is `key` on all four. `IssuingIntent` carries the axis and the
 * resolver honours it, but a `did:web` tenant needs a publicly resolvable URL
 * local dev cannot provide, so the DID-method axis is exercised only as a
 * blocked path — said plainly so its absence does not read as coverage.
 *
 * **`additive-only` in the base profile, never `optional`** — same reason as the
 * producer file, and `docs/adr/2026-08-21-additive-requirements-as-memberships.md`
 * states the invariant: an additive gives a base profile a companion badge,
 * never a harder denominator.
 */

type Suite = 'eddsa' | 'ecdsa';
type Protocol = 'oid4' | 'vcalm';

const SUITE_NAME: Record<Suite, string> = {
	eddsa: 'eddsa-rdfc-2022',
	ecdsa: 'ecdsa-rdfc-2019'
};

const TRANSPORT: Record<Protocol, string> = { oid4: 'OID4VCI', vcalm: 'VCALM' };

/**
 * The two requirements every one of the four declares — ids identical across the
 * protocol pair, so the two protocols' results compare like with like.
 *
 * **`issued-suite`** reuses M11's producer checks unchanged. They read the
 * credential off `StepEvidence.artifact`, which a claim settle populates from
 * `variables.results.default.verifiableCredential[0]`. It is not decoration:
 * without it, "your wallet accepted an ECDSA credential" would rest on nothing
 * but configuration. It is also the honest failure mode — if the pin silently
 * fell back to the default tenant, this row goes red rather than the scenario
 * passing under a false label.
 *
 * **`verified`** is attested because only the operator can see the wallet's
 * verdict: the wire cannot distinguish "verified and stored" from "stored
 * without checking". The DIC `consumer.resolve-issuer-dids` row **merges** into
 * it — a wallet that verified a Data Integrity proof necessarily resolved the
 * issuer's DID and matched its verification method, so scoring that separately
 * would count one fact twice.
 */
function consumerRequirements(suite: Suite): Requirement[] {
	return [
		{
			id: 'issued-suite',
			statement: `We issued this credential with a \`${SUITE_NAME[suite]}\` proof.`,
			level: 'MUST',
			check: { kind: 'automatic', checkId: `credential-di-proof-${suite}` }
		},
		{
			id: 'verified',
			statement: `Your wallet accepted this ${SUITE_NAME[suite]} credential with no signature or issuer error.`,
			level: 'MUST',
			check: { kind: 'attested', answer: { kind: 'affirm' } }
		}
	];
}

function summaryFor(suite: Suite, protocol: Protocol): string {
	const open =
		protocol === 'oid4'
			? 'Open the offer from inside your wallet'
			: 'Open the interaction URL from inside your wallet';
	return `We will issue a well-formed Open Badges credential signed with \`${SUITE_NAME[suite]}\` and offer it over ${TRANSPORT[protocol]}. ${open} and accept it. Everything about this credential is correct, so a wallet that supports the cryptosuite should take it without complaint — a signature or issuer error is the finding.`;
}

/** The blurb every member carries: this scenario belongs to THIS protocol's add-on badge. */
function blurbFor(suite: Suite, protocol: Protocol): string {
	return `Check that your wallet can verify a ${SUITE_NAME[suite]} credential, offered over ${TRANSPORT[protocol]}. It counts toward this protocol's Data Integrity Cryptosuites add-on badge; the other protocol has its own.`;
}

function acceptScenario(protocol: Protocol, suite: Suite) {
	return Scenario({
		slug: `${protocol}-wallet-accept-${suite}`,
		name: `Accept an ${suite === 'eddsa' ? 'EdDSA' : 'ECDSA'} credential over ${TRANSPORT[protocol]}`,
		blurb: blurbFor(suite, protocol),
		role: 'wallet',
		workflow: 'credential-acceptance',
		memberships: [
			{ profile: protocol, level: 'additive-only' },
			{ profile: 'data-integrity-cryptosuites', level: 'required' }
		],
		steps: [
			{
				id: 'offer',
				title: `Offer a ${SUITE_NAME[suite]} credential`,
				summary: summaryFor(suite, protocol),
				action: {
					kind: 'issue',
					credential: 'minimal-ob3',
					intent: { cryptosuite: SUITE_NAME[suite], didMethod: 'key' }
				},
				requirements: consumerRequirements(suite)
			}
		]
	});
}

export const oid4WalletAcceptEddsa = acceptScenario('oid4', 'eddsa');
export const vcalmWalletAcceptEddsa = acceptScenario('vcalm', 'eddsa');
export const oid4WalletAcceptEcdsa = acceptScenario('oid4', 'ecdsa');
export const vcalmWalletAcceptEcdsa = acceptScenario('vcalm', 'ecdsa');
