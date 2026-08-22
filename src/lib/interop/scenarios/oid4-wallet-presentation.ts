import { Scenario } from './scenario-schema.js';
import { walletPresentationRequirements } from './wallet-presentation-requirements.js';

/**
 * The suite plays verifier and asks the operator's wallet for a credential over
 * OID4VP, then measures the presentation that comes back.
 *
 * **Black-box, and deliberately so.** The suite never holds the holder key and
 * never builds the presentation; it sees exactly what the verify exchange
 * exposes, which the transaction service folds into `variables.results.default`.
 * That model is the 2026-07-11 black-box scoring ADR's and it survives this
 * migration intact — what changed is only where the scoring runs. It used to be
 * a server scorer behind `/api/wallet-runner/present-score`; it is now five pure
 * functions over the exchange record the page already polls, because the
 * evidence was always client-safe and the round trip bought nothing.
 *
 * There is **no new machinery here at all**: `request-presentation` was wired
 * end to end before this scenario existed — the create route mints a `verify`
 * exchange from the `ob3-any` request, `transportFor` picks the OID4VP link, and
 * `deriveVerifyRunState` already holds the two-phase `active` + `verifyTask`
 * window open so polling does not tear down before the async pass settles.
 *
 * The seven requirements are shared with the VCALM sibling — see
 * `wallet-presentation-requirements.ts` for what each one absorbed and why two
 * of them are attested.
 *
 * **The operator brings their own credential.** This scenario issues nothing, so
 * it needs a wallet that already holds an Open Badges credential. Presenting one
 * you were just issued is round-trip, which needs `expectCredentialFrom` and is
 * out of scope for the whole scenario effort.
 */
export const oid4WalletPresentation = Scenario({
	slug: 'oid4-wallet-presentation',
	name: 'Present a credential over OID4VP',
	blurb:
		'We ask your wallet for an Open Badges credential over OID4VP, and measure the presentation it sends back.',
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential',
			summary:
				'We will ask your wallet for any Open Badges credential you hold. Use one you already have — the acceptance scenario is one way to get one. Open the request from inside your wallet, choose the credential, and approve sharing it.',
			action: { kind: 'request-presentation', request: 'ob3-any' },
			requirements: walletPresentationRequirements
		}
	]
});
