import type { Requirement } from './requirement-schema.js';
import { Scenario } from './scenario-schema.js';

/**
 * The **conduct** scenarios — four wallet scenarios that vary *how* the suite
 * asks, and carry the five `*-recorded` checks the exchange-variation effort
 * shipped with no scenario home.
 *
 * **Why a row can measure our own request.** `baseVariablesSchema` on the
 * transaction service is a plain `z.object`, not `.strict()`, so it silently
 * drops what it does not name. An older service receiving
 * `oid4vpQueryLanguage: 'pex'` mints DCQL anyway: the suite believes it asked
 * for PEX, the wallet answers DCQL, and the run records a pass **under a false
 * label**. The `*-recorded` rows catch that in the run, with no upstream change
 * — the principle the exchange-variation map settled on:
 *
 * > Verify what you got; do not ask what is available.
 *
 * So each of these scenarios pairs a real wallet measurement with the row that
 * makes it trustworthy, and the requirement `statement` says plainly that the
 * row is about the suite's own request. A reader who sees a row that seems to
 * test our plumbing deserves the reason.
 *
 * **New siblings, not rows on the shipped scenarios.** Adding a conduct field to
 * `oid4-wallet-presentation` would change its **action**, which is inside
 * `scenarioFingerprint` — every stored run of it would be dropped. These cost
 * nobody a result, and they measure something genuinely different: a wallet may
 * understand DCQL and not PEX.
 *
 * All four are **`optional`** in `oid4` — the base profile's Expanded tier, the
 * house convention for a newly authored scenario, and the first real population
 * of that tier.
 */

/** The rows every conduct presentation shares: the wallet actually answered. */
function answered(): Requirement[] {
	return [
		{
			id: 'vp-delivered',
			statement: 'Your wallet sent a presentation to the verifier.',
			level: 'MUST',
			check: { kind: 'automatic', checkId: 'wallet-vp-delivered' }
		},
		{
			id: 'vp-signature-valid',
			statement: 'The presentation’s signature verified against your wallet’s key.',
			level: 'MUST',
			check: { kind: 'automatic', checkId: 'wallet-vp-signature-valid' }
		}
	];
}

/**
 * Does your wallet understand a **PEX** presentation request?
 *
 * OID4VP defines two query languages and the service defaults to DCQL, so a
 * wallet can pass every shipped presentation scenario having never seen a
 * Presentation Exchange descriptor. This asks the other half.
 */
export const oid4WalletPresentationPex = Scenario({
	slug: 'oid4-wallet-presentation-pex',
	name: 'Answer a PEX presentation request',
	blurb:
		'We ask your wallet for a credential using DIF Presentation Exchange rather than DCQL. A wallet may understand one and not the other.',
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential, asked for in PEX',
			summary:
				'We will ask your wallet for any Open Badges credential you hold, over OID4VP, phrasing the request as a DIF Presentation Exchange descriptor instead of DCQL. Open the request from inside your wallet and approve sharing. A wallet that only understands DCQL will not find a credential to offer — that is the measurement.',
			action: { kind: 'request-presentation', request: 'ob3-any', queryLanguage: 'pex' },
			requirements: [
				{
					id: 'asked-in-pex',
					statement: 'The verifier recorded the PEX query we asked it to send.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4vp-query-language-recorded' }
				},
				...answered()
			]
		}
	]
});

/**
 * Does your wallet handle a request that asks for **less than the whole
 * credential**?
 *
 * Carries the advertise-to-observe bait as well: extra cryptosuite names unioned
 * into the advertised `cryptosuite_values`, to coax a conformant wallet into
 * deriving a selective-disclosure proof so it can be *observed*. Observing is in
 * scope; a selective-disclosure additive profile is not, and none is authored —
 * whether the signing service can produce those proofs at all is an unresolved
 * open risk.
 *
 * `limitDisclosure` is `'preferred'`, not `'required'`: a wallet with no
 * selective-disclosure support still answers, so the scenario measures how it
 * copes rather than refusing to run at all.
 */
export const oid4WalletPresentationLimited = Scenario({
	slug: 'oid4-wallet-presentation-limited',
	name: 'Answer a request for less than the whole credential',
	blurb:
		'We ask your wallet for a credential while saying we would prefer only part of it, and while advertising selective-disclosure cryptosuites. We watch what your wallet does with that.',
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential, asked for with limited disclosure',
			summary:
				'We will ask your wallet for an Open Badges credential over OID4VP, using a PEX request that says we would prefer only some of its fields, and advertising selective-disclosure cryptosuites alongside the ordinary ones. Open the request from inside your wallet and approve sharing. A wallet with no selective-disclosure support should still present the whole credential — that is a pass, not a failure.',
			action: {
				kind: 'request-presentation',
				request: 'ob3-any',
				queryLanguage: 'pex',
				limitDisclosure: 'preferred',
				advertiseCryptosuites: ['ecdsa-sd-2023', 'bbs-2023']
			},
			requirements: [
				{
					id: 'asked-for-limited-disclosure',
					statement: 'The verifier recorded the limited-disclosure constraint we asked it to send.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'limit-disclosure-recorded' }
				},
				{
					id: 'advertised-sd-suites',
					statement:
						'The verifier recorded the selective-disclosure cryptosuites we asked it to advertise.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'advertised-cryptosuites-recorded' }
				},
				...answered()
			]
		}
	]
});

/**
 * How does your wallet build the issuer's metadata URL?
 *
 * **Wallet-borne, so observed rather than pinned.** The transaction service
 * serves both RFC 8414 constructions and discriminates on neither, so the
 * wallet's choice is the whole measurement and nothing the suite sends can steer
 * it. A SHOULD: a wallet with the older construction completes here and fails
 * against a stricter issuer later, which is exactly what a SHOULD is for.
 */
export const oid4WalletDiscovery = Scenario({
	slug: 'oid4-wallet-discovery',
	name: 'Find the issuer’s metadata the way RFC 8414 specifies',
	blurb:
		'An ordinary OID4VCI offer, while we watch how your wallet builds the metadata URL. We serve both constructions, so your wallet’s choice is the measurement.',
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'offer',
			title: 'Accept an ordinary credential offer',
			summary:
				'We will offer your wallet a well-formed Open Badges credential over OID4VCI. Nothing about this one is unusual — accept it as you normally would. What we are watching is how your wallet constructed the URL it fetched our metadata from.',
			action: { kind: 'issue', credential: 'minimal-ob3' },
			requirements: [
				{
					id: 'exchange-complete',
					statement: 'The exchange completed.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'exchange-reached-complete' }
				},
				{
					id: 'discovery-construction',
					statement: 'Your wallet built our metadata URL the way RFC 8414 §3.1 specifies.',
					level: 'SHOULD',
					check: { kind: 'automatic', checkId: 'discovery-construction-rfc8414' }
				}
			]
		}
	]
});

/**
 * Does your wallet refuse a credential whose proof was corrupted — asked
 * **without** hiding which credential is which?
 *
 * **This exists because `tamper-recorded` cannot live on a discrimination
 * scenario.** That check's whole purpose is protecting
 * `oid4-wallet-refusal-discrimination`: against a deployment predating the tamper
 * seam the instruction is stripped, an intact credential is delivered, the
 * operator honestly answers "accepted", and the scenario **fails a conformant
 * wallet**. But it is an *automatic* row, and automatic outcomes resolve live
 * rather than deferring to the end-of-run reveal — so putting it on the tampered
 * pass alone would give that pass a visible row the others lack, telling the
 * operator exactly which credential is the corrupted one. That is precisely what
 * the shuffled design exists to prevent, and the discrimination scenario's own
 * docstring says every pass must carry the identical requirement shape.
 *
 * So the check gets a **non-shuffled** home instead. This scenario is
 * deliberately weaker than the discrimination one — position is known, so it can
 * be answered without discriminating anything — and it is `optional` for that
 * reason. Its value is the precondition: one run tells the operator whether the
 * discrimination scenario they are about to take is trustworthy on this
 * deployment.
 */
export const oid4WalletTamperRefusal = Scenario({
	slug: 'oid4-wallet-tamper-refusal',
	name: 'Refuse a credential with a corrupted proof',
	blurb:
		'We offer your wallet a credential whose signature was corrupted after signing, and tell you so up front. Confirms both that your wallet refuses it and that this deployment can really corrupt one.',
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer a credential with a corrupted proof',
			summary:
				'We will offer your wallet an Open Badges credential whose cryptographic proof was corrupted after signing. Everything else about it is well-formed. Unlike the refusal-discrimination scenario we are telling you which one this is, because the point here is also to confirm that this deployment can corrupt a credential at all.',
			action: { kind: 'issue', credential: 'minimal-ob3', tamper: 'proof' },
			requirements: [
				{
					id: 'tamper-applied',
					statement: 'The exchange recorded the corruption we asked for.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'tamper-recorded' }
				},
				{
					id: 'refused',
					statement: 'Your wallet refused the credential, or reported its signature as invalid.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				}
			]
		}
	]
});
