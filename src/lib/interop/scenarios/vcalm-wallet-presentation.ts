import { cite } from './citations.js';
import { Scenario } from './scenario-schema.js';
import { walletPresentationRequirements } from './wallet-presentation-requirements.js';

/**
 * The VCALM half of the presentation pair — the suite plays verifier over a
 * VC-API exchange and measures the presentation the operator's wallet sends.
 *
 * Identical in requirements to `oid4-wallet-presentation`; see that scenario and
 * `wallet-presentation-requirements.ts` for the model. Only the transport
 * differs, and the scenario does not even name it: `transportFor` derives the
 * `iu` link from the base profile.
 *
 * **This scenario measures more than the VCALM pre-scenario checklist ever did.** The old
 * pre-scenario checklist declared `proof-binding` but not `di-vp-not-jwt` or
 * `vp-signature-valid`, and the engine registered a check for the first only —
 * so two facts the exchange plainly reported went unscored. They are scored
 * here, from checks that already existed. `mapping.md` § 4 records the gain.
 */
export const vcalmWalletPresentation = Scenario({
	slug: 'vcalm-wallet-presentation',
	name: 'Present a credential over VCALM',
	blurb:
		'We ask the wallet for an Open Badges credential over VCALM, and measure the presentation it sends back.',
	framing: {
		builder:
			'You’re testing whether your own wallet can answer a VCALM presentation request with a presentation a verifier will trust: Data Integrity rather than JWT, signed, bound to this exchange, and still carrying the issuer’s original proof. Have a build that already holds an Open Badges credential; the acceptance scenario will give it one. A binding failure usually means the proof is missing its `challenge` or `domain`, or carries ones the exchange didn’t issue.',
		evaluator:
			'You’re checking whether a vendor’s wallet can share a credential over VCALM in a form a verifier can trust. The wire checks the presentation itself; the two questions are yours, so watch for a consent prompt and for the wallet naming the credential before it sends. The wallet needs an Open Badges credential already — ask the vendor to show one in its list first. Any failed wire check means a strict verifier would reject what this wallet sends.'
	},
	standards: [cite.vcalmDidAuthenticationResponse, cite.diProofs],
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential',
			summary:
				'We will ask the wallet for any Open Badges credential it holds. Use one it already has — the acceptance scenario is one way to get one. Open the interaction URL from inside the wallet, choose the credential, and approve sharing it.',
			action: { kind: 'request-presentation', request: 'ob3-any' },
			requirements: walletPresentationRequirements
		}
	]
});
