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
 * **This scenario measures more than the VCALM checklist ever did.** The old
 * checklist declared `proof-binding` but not `di-vp-not-jwt` or
 * `vp-signature-valid`, and the engine registered a check for the first only —
 * so two facts the exchange plainly reported went unscored. They are scored
 * here, from checks that already existed. `mapping.md` § 4 records the gain.
 */
export const vcalmWalletPresentation = Scenario({
	slug: 'vcalm-wallet-presentation',
	name: 'Present a credential over VCALM',
	blurb:
		'We ask your wallet for an Open Badges credential over VCALM, and measure the presentation it sends back.',
	role: 'wallet',
	workflow: 'credential-presentation',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'present',
			title: 'Present a credential',
			summary:
				'We will ask your wallet for any Open Badges credential you hold. Use one you already have — the acceptance scenario is one way to get one. Open the interaction URL from inside your wallet, choose the credential, and approve sharing it.',
			action: { kind: 'request-presentation', request: 'ob3-any' },
			requirements: walletPresentationRequirements
		}
	]
});
