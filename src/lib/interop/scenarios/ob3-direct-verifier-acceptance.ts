import { Scenario, type ScenarioStep } from './scenario-schema.js';

/**
 * The migrated verifier direct-delivery page: four credentials — one valid,
 * three defective — handed to the operator's verifier one after another in a
 * random order. For each, the operator reports what their verifier decided and
 * what problem it named; only then is the ground truth revealed.
 *
 * **This is one measurement across four passes, not four scenarios.** The passes
 * are `shuffle: true` and contiguous, so position leaks nothing — and every pass
 * carries the **identical requirement shape** (a verdict and a reason, same
 * options), so which credential is which cannot be learned from the questions
 * either. Only the concealed right answers differ.
 *
 * There is **no automatic check**: direct delivery is a file the operator moves
 * out of band, so the suite never observes the verifier's decision. That is why
 * the verdict is attested — a verifier is software with a structured decision,
 * so "did it accept or reject, and did it name the right problem?" is exactly
 * the quiz.
 *
 * Two requirements, two severities:
 * - **verdict (MUST)** — accepting a defective credential, or rejecting the
 *   valid one, fails.
 * - **reason (SHOULD)** — naming the wrong problem (or none, or a vague
 *   "something else") is a recorded but non-blocking finding. This is what the
 *   old scorer expressed as a `warn`; the scenario model has no `warn`, so a
 *   SHOULD carries it. The reason is asked on **every** pass — including the
 *   valid one, whose right answer is "no problem, it accepted" — so the valid
 *   pass is not the odd one out with a question missing.
 */
function pass(
	id: string,
	action: ScenarioStep['action'],
	setup: string,
	verdict: 'accepted' | 'rejected',
	reason: 'none' | 'signature' | 'schema' | 'expiry'
): ScenarioStep {
	return {
		id,
		// Never rendered for a shuffled step — the page shows `${shuffleLabel} ${n}`.
		// Kept honest for the catalog and tests.
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
						// `other` is offered but is never the right answer, so a verifier
						// that rejects for the right kind while reporting a vague cause
						// records a SHOULD miss.
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

export const ob3DirectVerifierAcceptance = Scenario({
	slug: 'ob3-direct-verifier-acceptance',
	name: 'Tell a good credential from a bad one — as a verifier',
	blurb:
		'Four credentials, one after another, in a random order — one valid and three defective. Download each, feed it to your verifier, and report what it decided. Then we tell you what it should have.',
	role: 'verifier',
	workflow: 'direct-credential-verification',
	memberships: [{ profile: 'ob3-direct-delivery', level: 'required' }],
	shuffleLabel: 'Credential',
	steps: [
		pass(
			'valid',
			{ kind: 'deliver-direct', credential: 'minimal-ob3' },
			'A well-formed Open Badges 3.0 credential. Everything about this one is correct.',
			'accepted',
			'none'
		),
		pass(
			'broken-signature',
			{ kind: 'deliver-direct', credential: 'minimal-ob3', tamper: 'proof' },
			'An Open Badges credential whose cryptographic proof was corrupted after signing. Everything else about it is well-formed.',
			'rejected',
			'signature'
		),
		pass(
			'schema-problem',
			{ kind: 'deliver-direct', credential: 'schema-invalid-ob3' },
			'An Open Badges credential missing a field its schema requires. Its signature is valid over the document as handed to you.',
			'rejected',
			'schema'
		),
		pass(
			'expired',
			{ kind: 'deliver-direct', credential: 'ob3-expired' },
			'An Open Badges credential whose validity period ended in 2024. Everything else about it is well-formed.',
			'rejected',
			'expiry'
		)
	]
});
