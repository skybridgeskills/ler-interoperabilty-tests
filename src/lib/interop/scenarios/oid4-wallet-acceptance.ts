import { cite } from './citations.js';
import { Scenario } from './scenario-schema.js';

/**
 * The migrated happy path — one credential, offered once over OID4VCI, and the
 * questions that decide whether the wallet took it and showed it.
 *
 * This is the scenario that proves a bespoke page is no longer needed: it says
 * in data everything `/wallet/credential-acceptance/oid4` used to say in code.
 * One `issue` step, the `minimal-ob3` recipe, no pinned `intent` (elective — the
 * deployment's own tenant issues it).
 *
 * The two automatic MUSTs are the wire truth, resolved the instant the step
 * settles: the exchange completed, and the wallet proved control of a DID. The
 * attested MUST is the one the wire cannot see — a wallet can complete an
 * exchange and still drop the credential on the floor, so only the operator can
 * confirm it landed in the list. The SHOULD characterises what the wallet drew.
 */
export const oid4WalletAcceptance = Scenario({
	slug: 'oid4-wallet-acceptance',
	name: 'Accept a well-formed credential over OID4VCI',
	blurb:
		'Offer the wallet a well-formed Open Badges credential over OID4VCI, and confirm it took it.',
	framing: {
		builder:
			'You’re testing your own wallet on the simplest thing an OID4VCI wallet must do: take a correct credential and keep it. Have a build that can open a pre-authorized code offer and prove control of a DID. If the exchange completes but the credential never appears in the list, your wallet received it and lost it somewhere between the credential response and storage.',
		evaluator:
			'You’re checking whether a vendor’s wallet can take a correct Open Badges credential over OID4VCI and keep it — the baseline every other wallet scenario builds on. The wire covers the exchange; what you judge is the screen afterwards. If the vendor is driving, ask them to show you the credential list rather than describe it, and note whether the achievement appears as a card or as raw data. A failure here means the wallet isn’t ready for anything harder.'
	},
	standards: [cite.vciPreAuthorizedCode, cite.vciBinding],
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer the credential',
			summary:
				'We will offer the wallet a well-formed Open Badges credential over OID4VCI. Everything about this one is correct — accepting it is the right thing to do.',
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
