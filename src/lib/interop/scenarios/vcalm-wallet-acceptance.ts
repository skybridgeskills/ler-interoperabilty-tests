import { cite } from './citations.js';
import { Scenario } from './scenario-schema.js';

/**
 * The VCALM happy path — one credential, offered once over a VC-API exchange,
 * and the questions that decide whether the wallet took it and showed it.
 *
 * The `oid4-wallet-acceptance` sibling, transport swapped. The requirement ids,
 * levels and right answers are identical on purpose: the two scenarios ask the
 * same question of the same wallet over two protocols, and a reader comparing
 * an OID4 result with a VCALM one should be comparing like with like. A test
 * asserts that parity, so an edit to one side cannot silently drift.
 *
 * Nothing here was ported from the VCALM pre-scenario checklist, because there was nothing
 * to port: `/wallet/credential-acceptance/vcalm` called no scoring endpoint and
 * not one `vcalm.wallet.credential-acceptance.*` id had a registered check.
 * Twenty-one rows rendered and none of them gated. `mapping.md` § 2 records
 * where each one lands.
 *
 * The two automatic MUSTs are the wire truth, resolved the instant the step
 * settles: the exchange completed, and the wallet proved control of a DID
 * through the DIDAuthentication response VCALM requires. The attested MUST is
 * the one the wire cannot see — the exchange completes whether or not the
 * wallet keeps what it was handed. The SHOULD characterises what the wallet
 * drew.
 *
 * No pinned `intent`: elective, so the deployment's own tenant issues, and it
 * always can. The scenarios that pin are the `data-integrity-cryptosuites`
 * acceptance ones.
 */
export const vcalmWalletAcceptance = Scenario({
	slug: 'vcalm-wallet-acceptance',
	name: 'Accept a well-formed credential over VCALM',
	blurb:
		'Offer the wallet a well-formed Open Badges credential over VCALM, and confirm it took it.',
	framing: {
		builder:
			'You’re testing your own wallet on the simplest thing a VCALM wallet must do: take a correct credential and keep it. Have a build that can open an interaction URL and answer the DIDAuthentication request with a DID it controls. If the exchange completes but the credential never appears in the list, your wallet received it and lost it somewhere between the exchange response and storage.',
		evaluator:
			'You’re checking whether a vendor’s wallet can take a correct Open Badges credential over VCALM and keep it — the baseline every other wallet scenario builds on. The wire covers the exchange; what you judge is the screen afterwards. If the vendor is driving, ask them to show you the credential list rather than describe it, and note whether the achievement appears as a card or as raw data. A failure here means the wallet isn’t ready for anything harder.'
	},
	standards: [cite.vcalmParticipate, cite.vcalmDidAuthentication],
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer the credential',
			summary:
				'We will offer the wallet a well-formed Open Badges credential over a VCALM exchange. Open the interaction URL from inside the wallet. Everything about this one is correct — accepting it is the right thing to do.',
			action: { kind: 'issue', credential: 'minimal-ob3' },
			requirements: [
				{
					id: 'exchange-complete',
					statement: 'The exchange completed.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'exchange-reached-complete' }
				},
				{
					id: 'holder-bound',
					statement: 'The wallet proved control of a DID.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'holder-did-bound' }
				},
				{
					id: 'stored',
					statement: 'The credential appears in the wallet’s credential list.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				},
				{
					id: 'displayed',
					statement: 'What did the wallet display for the achievement?',
					level: 'SHOULD',
					check: {
						kind: 'attested',
						answer: {
							kind: 'choose',
							options: [
								{ value: 'nothing', label: 'Nothing' },
								{ value: 'raw-json', label: 'A raw JSON blob' },
								{ value: 'card', label: 'A rendered card' },
								{ value: 'error', label: 'An error message' }
							],
							correct: 'card'
						}
					}
				}
			]
		}
	]
});
