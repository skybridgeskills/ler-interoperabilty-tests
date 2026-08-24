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
		'Offer your wallet a well-formed Open Badges credential over OID4VCI, and confirm it took it.',
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer the credential',
			summary:
				'We will offer your wallet a well-formed Open Badges credential over OID4VCI. Everything about this one is correct — accepting it is the right thing to do.',
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
					statement: 'Your wallet proved control of a DID.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'holder-did-bound' }
				},
				{
					id: 'stored',
					statement: 'The credential appears in your wallet’s credential list.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				},
				{
					id: 'displayed',
					statement: 'What did your wallet display for the achievement?',
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
