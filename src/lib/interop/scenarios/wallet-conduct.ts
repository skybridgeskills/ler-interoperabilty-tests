import { cite } from './citations.js';
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
			statement: 'The wallet sent a presentation to the verifier.',
			level: 'MUST',
			check: { kind: 'automatic', checkId: 'wallet-vp-delivered' }
		},
		{
			id: 'vp-signature-valid',
			statement: 'The presentation’s signature verified against the wallet’s key.',
			level: 'MUST',
			check: { kind: 'automatic', checkId: 'wallet-vp-signature-valid' }
		}
	];
}

/**
 * Does the wallet understand a **PEX** presentation request?
 *
 * OID4VP defines two query languages and the service defaults to DCQL, so a
 * wallet can pass every shipped presentation scenario having never seen a
 * Presentation Exchange descriptor. This asks the other half.
 */
export const oid4WalletPresentationPex = Scenario({
	slug: 'oid4-wallet-presentation-pex',
	name: 'Answer a PEX presentation request',
	blurb:
		'We ask the wallet for a credential using DIF Presentation Exchange rather than DCQL. A wallet may understand one and not the other.',
	framing: {
		builder:
			'You’re testing whether your own wallet understands a DIF Presentation Exchange request, not only DCQL. Have a build that holds an Open Badges credential and can match a `presentation_definition`. If your wallet finds nothing to offer, it isn’t matching PEX input descriptors; if the first row fails, the suite’s verifier couldn’t send PEX, so the run says nothing about your wallet.',
		evaluator:
			'You’re checking whether a vendor’s wallet can answer a verifier that asks in DIF Presentation Exchange rather than DCQL, as some verifiers still do. Watch whether the wallet offers a credential at all — a wallet that finds nothing to share understands only DCQL. If the first row fails, the fault is this deployment’s, not the wallet’s, and the result says nothing about it.'
	},
	standards: [cite.pexPresentationDefinition],
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential, asked for in PEX',
			summary:
				'We will ask the wallet for any Open Badges credential it holds, over OID4VP, phrasing the request as a DIF Presentation Exchange descriptor instead of DCQL. Open the request from inside the wallet and approve sharing. A wallet that only understands DCQL will not find a credential to offer — that is the measurement.',
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
 * Does the wallet handle a request that asks for **less than the whole
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
		'We ask the wallet for a credential while saying we would prefer only part of it, and while advertising selective-disclosure cryptosuites. We watch what the wallet does with that.',
	framing: {
		builder:
			'You’re testing how your own wallet copes with a PEX request that prefers only part of a credential, from a verifier advertising selective-disclosure cryptosuites. Have a build that holds an Open Badges credential. Presenting the whole credential, signed, is a pass; what fails is an error or an empty choice, which usually means the `limit_disclosure` constraint or the unfamiliar suites broke your request handling.',
		evaluator:
			'You’re checking whether a vendor’s wallet stays usable when a verifier asks for less than the whole credential. Selective disclosure isn’t required to pass — sending the whole credential, signed, is fine — so watch for an error or an empty choice instead. If the vendor claims selective-disclosure support, ask them to show what the wallet shares here; the two recorded rows only confirm the deployment sent the request as described.'
	},
	standards: [cite.pexLimitedDisclosure],
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential, asked for with limited disclosure',
			summary:
				'We will ask the wallet for an Open Badges credential over OID4VP, using a PEX request that says we would prefer only some of its fields, and advertising selective-disclosure cryptosuites alongside the ordinary ones. Open the request from inside the wallet and approve sharing. A wallet with no selective-disclosure support should still present the whole credential — that is a pass, not a failure.',
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
 * How does the wallet build the issuer's metadata URL?
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
		'An ordinary OID4VCI offer, while we watch how the wallet builds the metadata URL. We serve both constructions, so the wallet’s choice is the measurement.',
	framing: {
		builder:
			'You’re testing how your own wallet builds an issuer’s metadata URL: the well-known segment inserted between host and path, as RFC 8414 §3.1 specifies, or tacked onto the end. Accept the offer as you normally would; the suite serves both forms, so the exchange completes either way. A miss on the SHOULD means a stricter issuer will 404 your wallet’s metadata fetch before it ever requests a credential.',
		evaluator:
			'You’re checking a detail of a vendor’s wallet that only shows up against stricter issuers: how it builds the URL for an issuer’s metadata. There’s nothing to judge on screen — the offer is ordinary, and the suite reads the answer off the request the wallet makes. A miss is only a SHOULD, but expect that wallet to fail with issuers that serve metadata only where RFC 8414 puts it.'
	},
	standards: [cite.rfc8414MetadataRequest, cite.vciMetadataRetrieval],
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'offer',
			title: 'Accept an ordinary credential offer',
			summary:
				'We will offer the wallet a well-formed Open Badges credential over OID4VCI. Nothing about this one is unusual — accept it as you normally would. What we are watching is how the wallet constructed the URL it fetched our metadata from.',
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
					statement: 'The wallet built our metadata URL the way RFC 8414 §3.1 specifies.',
					level: 'SHOULD',
					check: { kind: 'automatic', checkId: 'discovery-construction-rfc8414' }
				}
			]
		}
	]
});

/**
 * Does the wallet refuse a credential whose proof was corrupted — asked
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
		'We offer the wallet a credential whose signature was corrupted after signing, and tell you so up front. Confirms both that the wallet refuses it and that this deployment can really corrupt one.',
	framing: {
		builder:
			'You’re testing that your own wallet refuses a credential with a corrupted proof, and that this deployment can really corrupt one. You’re told which credential it is, so it’s the easy version — worth a run before the refusal-discrimination scenario. If the first row fails, the deployment can’t tamper and the discrimination scenario would fail a correct wallet; if the second fails, your wallet isn’t verifying proofs on receipt.',
		evaluator:
			'You’re checking that a vendor’s wallet rejects a credential whose signature was broken after signing, with nothing hidden about which one it is. Watch for a refusal or an invalid-signature message; a quiet acceptance is a fail. This is the weaker, known-position version, so read it mainly as a precondition: if the first row fails, refusal-discrimination results from this deployment can’t be trusted.'
	},
	standards: [cite.diVerifyProof, cite.obVerification],
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer a credential with a corrupted proof',
			summary:
				'We will offer the wallet an Open Badges credential whose cryptographic proof was corrupted after signing. Everything else about it is well-formed. Unlike the refusal-discrimination scenario we are telling you which one this is, because the point here is also to confirm that this deployment can corrupt a credential at all.',
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
					statement: 'The wallet refused the credential, or reported its signature as invalid.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				}
			]
		}
	]
});
