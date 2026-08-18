import { Scenario, type ScenarioStep } from './scenario-schema.js';

/**
 * The scenario the whole architecture exists for: three credentials offered one
 * after another in a random order — one fine, two not — where the operator must
 * judge what their wallet did with each, and only then is told what actually
 * happened.
 *
 * **This is one measurement, not three.** The passes exist for sequence; a joint
 * measurement across several passes is one measurement, so it is one scenario
 * with one result. The passes are `shuffle: true` and contiguous, so they
 * permute together and cannot be learned by position — every pass carries the
 * identical requirement shape, and the only thing that differs is the concealed
 * right answer.
 *
 * The automatic check is deliberately weak — that the wallet engaged the offer
 * at all. The wire cannot distinguish "refused after parsing" from "crashed",
 * and it cannot see a private refusal: delivery succeeds and the wallet drops
 * the credential afterwards, past our last observation point. That gap is
 * exactly why the MUST that matters is **attested**, and why the SHOULD asks
 * whether the wallet was legible about what it decided — a wallet can behave
 * perfectly and communicate terribly, and no wire-level test can tell.
 */
function pass(
	id: string,
	action: ScenarioStep['action'],
	setup: string,
	correct: string
): ScenarioStep {
	return {
		id,
		// Authored titles are never rendered for a shuffled step — the page shows
		// `${shuffleLabel} ${n}` instead. Kept honest for the catalog and tests.
		title: `Offer the ${id} credential`,
		summary: setup,
		action,
		shuffle: true,
		requirements: [
			{
				id: `${id}-engaged`,
				statement: 'Your wallet fetched the offer.',
				level: 'MUST',
				check: { kind: 'automatic', checkId: 'offer-was-fetched' }
			},
			{
				id: `${id}-handled`,
				statement: 'What did your wallet do with this credential?',
				level: 'MUST',
				check: {
					kind: 'attested',
					answer: {
						kind: 'choose',
						options: [
							{ value: 'accepted', label: 'Accepted it' },
							{ value: 'refused', label: 'Refused it' },
							{ value: 'warned', label: 'Accepted it, with a visible warning' }
						],
						correct
					}
				}
			},
			{
				id: `${id}-legible`,
				statement: 'Your wallet made clear what it decided about this credential.',
				level: 'SHOULD',
				check: { kind: 'attested', answer: { kind: 'affirm' } }
			}
		]
	};
}

export const oid4WalletRefusalDiscrimination = Scenario({
	slug: 'oid4-wallet-refusal-discrimination',
	name: 'Tell a good credential from a bad one',
	blurb:
		'Three credentials, one after another, in a random order. Some are fine and some are not. After each one we ask what your wallet did — then tell you what actually happened.',
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	// The neutral, positional label a shuffled step renders instead of its
	// authored title — "Credential 1", "Credential 2" — so the order of the
	// passes leaks nothing.
	shuffleLabel: 'Credential',
	steps: [
		pass(
			'control',
			{ kind: 'issue', credential: 'minimal-ob3' },
			'We will offer your wallet a well-formed Open Badges credential over OID4VCI. Everything about this one is correct.',
			'accepted'
		),
		pass(
			'expired',
			{ kind: 'issue', credential: 'ob3-expired' },
			'We will offer your wallet an Open Badges credential whose validity period ended in 2024. Everything else about it is well-formed.',
			'refused'
		),
		pass(
			'tampered',
			{ kind: 'issue', credential: 'minimal-ob3', tamper: 'proof' },
			'We will offer your wallet an Open Badges credential whose cryptographic proof was corrupted after signing. Everything else about it is well-formed.',
			'refused'
		)
	]
});
