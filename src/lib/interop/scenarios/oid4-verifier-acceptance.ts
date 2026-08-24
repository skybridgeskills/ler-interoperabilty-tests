import { Scenario, type ScenarioStep } from './scenario-schema.js';

/**
 * The OID4VP verifier **acceptance** scenario — the discrimination measurement,
 * delivered live. Four credentials — one valid, three defective — each presented
 * to the operator's verifier over OID4VP (`direct_post`), in a random order. For
 * each, the operator reports what their verifier decided and what problem it
 * named; only once the run is complete is the ground truth revealed.
 *
 * The OID4VP sibling of `vcalm-verifier-acceptance` — **identical in shape**,
 * changing only the transport (`oid4vp`). OID4VP requests may be reused across
 * presents (unlike VCALM's single-use exchange), so the paste field offers a
 * "use the same request" toggle; that is a UI convenience only — the passes are
 * `shuffle: true` and contiguous, and every pass carries the **identical
 * requirement shape** (a verdict and a reason, same options), so neither position
 * nor the questions leak which credential is which.
 *
 * **The present is a precondition, not a scored requirement** — "delivery is not
 * spelled out" here (that is the *delivery* scenario's measurement). The
 * `present-to-verifier` step retries until the credential is submitted, and then
 * the only requirements are attested:
 * - **verdict (MUST)** — accepting a defective credential, or rejecting the valid
 *   one, fails.
 * - **reason (SHOULD)** — naming the wrong problem (or none, or a vague "something
 *   else") is a recorded but non-blocking finding. Asked on **every** pass, so the
 *   valid pass is not the odd one out.
 *
 * Reveals defer to end-of-run (the shared runner's rule for attested outcomes),
 * so answering one pass never primes the next.
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
		title: `Present the ${id} credential`,
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

export const oid4VerifierAcceptance = Scenario({
	slug: 'oid4-verifier-acceptance',
	name: 'Tell a good credential from a bad one — as an OID4VP verifier',
	blurb:
		'Four credentials, one after another, in a random order — one valid and three defective. We present each to your verifier over OID4VP; you report what it decided. Then we tell you what it should have.',
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	memberships: [{ profile: 'oid4', level: 'required' }],
	shuffleLabel: 'Credential',
	steps: [
		pass(
			'valid',
			{ kind: 'present-to-verifier', credential: 'minimal-ob3', transport: 'oid4vp' },
			'A well-formed Open Badges 3.0 credential. Everything about this one is correct.',
			'accepted',
			'none'
		),
		pass(
			'broken-signature',
			{
				kind: 'present-to-verifier',
				credential: 'minimal-ob3',
				transport: 'oid4vp',
				tamper: 'proof'
			},
			'An Open Badges credential whose cryptographic proof was corrupted after signing. Everything else about it is well-formed.',
			'rejected',
			'signature'
		),
		pass(
			'schema-problem',
			{ kind: 'present-to-verifier', credential: 'schema-invalid-ob3', transport: 'oid4vp' },
			'An Open Badges credential missing a field its schema requires. Its signature is valid over the document as presented.',
			'rejected',
			'schema'
		),
		pass(
			'expired',
			{ kind: 'present-to-verifier', credential: 'ob3-expired', transport: 'oid4vp' },
			'An Open Badges credential whose validity period ended in 2024. Everything else about it is well-formed.',
			'rejected',
			'expiry'
		)
	]
});
