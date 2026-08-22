import type { RequirementOutcome, ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import { Scenario, scenarioFingerprint } from '$lib/interop/scenarios/index.js';

/**
 * A scenario for the stories to drive.
 *
 * Not a catalog entry — `allScenarios` is filled by M6, and a fixture that
 * pretended to be one would make the stories fail the day the real catalog
 * lands. Three shuffled passes plus a debrief, which is the shape the migrated
 * verifier scenarios take, so the stories exercise the labelling and the
 * collapsing spine rather than a degenerate one-step case.
 */
export const demoScenario: Scenario = Scenario({
	slug: 'oid4-wallet-refusal-discrimination',
	name: 'Tell a good credential from a bad one',
	blurb:
		'Three credentials, one after another, in a random order. Some are fine and some are not. After each one we ask what your wallet did — then tell you what actually happened.',
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	shuffleLabel: 'Credential',
	steps: [
		pass('good', 'minimal-ob3', 'accepted', 'Everything about this one is well-formed.'),
		pass(
			'expired',
			'expired-ob3',
			'refused',
			'Its validity period ended in 2024. Everything else about it is well-formed.'
		),
		pass(
			'tampered',
			'minimal-ob3',
			'refused',
			'Its proof was corrupted after signing. Everything else about it is well-formed.'
		),
		{
			id: 'debrief',
			title: 'Debrief',
			summary: 'One question about the three you just saw.',
			requirements: [
				{
					id: 'debrief-told',
					statement: 'Your wallet made clear which of the three it had refused.',
					level: 'SHOULD',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				}
			]
		}
	]
});

function pass(id: string, credential: string, correct: string, setup: string) {
	return {
		id,
		title: `Offer the ${id} credential`,
		summary: `We will offer your wallet an Open Badges credential. ${setup}`,
		action: { kind: 'issue' as const, credential },
		shuffle: true as const,
		requirements: [
			{
				id: `${id}-exchange`,
				statement: 'The exchange completed.',
				level: 'MUST' as const,
				check: { kind: 'automatic' as const, checkId: 'exchange-reached-complete' }
			},
			{
				id: `${id}-handled`,
				statement: 'What did your wallet do with this credential?',
				level: 'MUST' as const,
				check: {
					kind: 'attested' as const,
					answer: {
						kind: 'choose' as const,
						options: [
							{ value: 'accepted', label: 'Accepted it' },
							{ value: 'refused', label: 'Refused it' },
							{ value: 'warned', label: 'Accepted it, with a visible warning' }
						],
						correct
					}
				}
			}
		]
	};
}

const outcome = (
	requirementId: string,
	over: Partial<RequirementOutcome> = {}
): RequirementOutcome => ({
	requirementId,
	level: 'MUST',
	status: 'pass',
	source: 'attested',
	...over
});

/** Every requirement answered — three right, one honest `can't tell`, one miss. */
export const finishedOutcomes: Record<string, RequirementOutcome> = {
	'good-exchange': outcome('good-exchange', { source: 'automated' }),
	'good-handled': outcome('good-handled', {
		answer: { kind: 'choose', value: 'accepted' },
		expected: { kind: 'choose', value: 'accepted' }
	}),
	'expired-exchange': outcome('expired-exchange', { source: 'automated' }),
	'expired-handled': outcome('expired-handled', {
		status: 'fail',
		answer: { kind: 'choose', value: 'accepted' },
		expected: { kind: 'choose', value: 'refused' }
	}),
	'tampered-exchange': outcome('tampered-exchange', { source: 'automated' }),
	'tampered-handled': outcome('tampered-handled', {
		status: 'fail',
		answer: { kind: 'cant-tell' },
		expected: { kind: 'choose', value: 'refused' },
		detail: 'You could not tell — which is itself the finding.'
	}),
	'debrief-told': outcome('debrief-told', {
		level: 'SHOULD',
		status: 'fail',
		answer: { kind: 'affirm', value: false },
		expected: { kind: 'affirm', value: true }
	})
};

export const storedRun: ScenarioRunRecord = {
	scenarioSlug: demoScenario.slug,
	ranAt: '2026-08-18T09:00:00.000Z',
	fingerprint: scenarioFingerprint(demoScenario),
	status: 'failed',
	outcomes: finishedOutcomes,
	attempts: 2
};

/**
 * A `deliver-direct` scenario — a single file the operator downloads and hands
 * to the system under test, then attests. No exchange is minted; the step
 * settles as soon as the credential is signed, so this drives the
 * download-panel-then-answer choreography the exchange fixtures cannot.
 */
export const directDeliveryScenario: Scenario = Scenario({
	slug: 'ob3-direct-verifier-acceptance',
	name: 'Hand your verifier a credential',
	blurb: 'Download a credential, feed it to your verifier, and report what it decided.',
	role: 'verifier',
	workflow: 'direct-credential-verification',
	memberships: [{ profile: 'ob3-direct-delivery', level: 'required' }],
	steps: [
		{
			id: 'valid',
			title: 'Offer the valid credential',
			summary: 'We will hand your verifier a well-formed Open Badges credential.',
			action: { kind: 'deliver-direct', credential: 'minimal-ob3' },
			requirements: [
				{
					id: 'valid-verdict',
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
							correct: 'accepted'
						}
					}
				}
			]
		}
	]
});

/**
 * A `present-to-verifier` scenario — the operator pastes their verifier's live
 * interaction URL, the suite presents a credential to it, and the operator
 * attests the verdict. Drives the paste-field → present → settle → answer
 * choreography that the exchange and direct fixtures cannot. Not a catalog entry
 * (P4 authors the real vcalm scenarios).
 */
export const presentScenario: Scenario = Scenario({
	slug: 'vcalm-present-fixture',
	name: 'Present a credential to your verifier',
	blurb: 'Paste your verifier’s interaction URL, present, and report what it decided.',
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'present',
			title: 'Present the credential',
			summary: 'We will present a credential to your verifier over a VC-API exchange.',
			action: { kind: 'present-to-verifier', credential: 'minimal-ob3', transport: 'vcalm' },
			requirements: [
				{
					id: 'verdict',
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
							correct: 'accepted'
						}
					}
				}
			]
		}
	]
});

/**
 * A live `receive-from-issuer` scenario, for the miss path: the operator pastes
 * an offer URL, the issuer delivers nothing, the step stays in flight — and the
 * Details panel has to explain why.
 */
export const receiveScenario: Scenario = Scenario({
	slug: 'oid4-receive-fixture',
	name: 'Issue a credential to us over OID4VCI',
	blurb: 'Paste a pre-authorized-code credential offer and we will redeem it as a wallet would.',
	role: 'issuer',
	workflow: 'credential-issuance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'issue',
			title: 'Issue a credential',
			summary: 'We will redeem your credential offer as a wallet would.',
			action: {
				kind: 'receive-from-issuer',
				transport: 'oid4vci',
				keyProofSuite: 'eddsa-rdfc-2022'
			},
			requirements: [
				{
					id: 'credential-endpoint',
					statement: 'Your credential endpoint delivered a credential.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-issuer-credential-endpoint' }
				}
			]
		}
	]
});

/** A single-action-step scenario — the only shape attach mode accepts (D3). */
export const singleStepScenario: Scenario = Scenario({
	slug: 'oid4-wallet-acceptance',
	name: 'Accept a well-formed credential',
	blurb: 'The happy path: one credential, offered once.',
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer the credential',
			summary: 'We will offer your wallet a well-formed Open Badges credential.',
			action: { kind: 'issue', credential: 'minimal-ob3' },
			requirements: [
				{
					id: 'exchange-complete',
					statement: 'The exchange completed.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'exchange-reached-complete' }
				},
				{
					id: 'stored',
					statement: 'The credential appears in your wallet’s list.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				}
			]
		}
	]
});
