import { cite } from './citations.js';
import { Scenario } from './scenario-schema.js';

/**
 * The **Complete** (expanded) tier's proof scenario for `oid4`/wallet: accept a
 * fully-decorated Open Badges credential and confirm the wallet *renders* it —
 * the image, the achievement name and description, the issuer. Core acceptance
 * (`oid4-wallet-acceptance`) proves a wallet takes a credential and shows
 * *something*; this proves it shows it *faithfully*.
 *
 * `optional` in `oid4`, wallet role — so it lands in the Complete sub-meter, not
 * the base one. Its badge is `oid4-wallet-complete`.
 *
 * The single automatic MUST is the wire truth (the exchange settled). Rendering
 * is not wire-visible — only the operator can see what the wallet drew — so the
 * display facets are **attested SHOULDs**: a wallet that stores the credential
 * but renders it poorly still runs the scenario and simply does not fill the
 * Complete meter. `can't tell` is offered on every attested requirement (the
 * runner appends it) and fails, so an unanswerable facet cannot pass by default.
 */
export const oid4WalletFaithfulRendering = Scenario({
	slug: 'oid4-wallet-faithful-rendering',
	name: 'Render a decorated credential faithfully',
	blurb:
		'Offer the wallet a fully-decorated Open Badges credential — image, rich achievement, issuer — and confirm it shows them, not raw data.',
	framing: {
		builder:
			'You’re testing whether your own wallet shows a decorated credential the way its issuer meant it: the badge image, the achievement’s name and description, and who issued it. Have a build that renders Open Badges fields rather than a generic credential view. These count toward the OID4 Standard Profile’s Expanded tier rather than Essential, so a miss is a gap, not a failure — usually a field your wallet parses but never draws.',
		evaluator:
			'You’re checking whether a vendor’s wallet shows a credential faithfully, not just that it stores one. Look at the credential itself, opening its detail view if the list shows only a tile: is the image real rather than a placeholder, are the achievement’s name and description both there, is the issuer named? A wallet that shows only a name or raw JSON here will show every badge that way.'
	},
	standards: [cite.obDocument],
	role: 'wallet',
	workflow: 'credential-acceptance',
	memberships: [{ profile: 'oid4', level: 'optional' }],
	steps: [
		{
			id: 'offer',
			title: 'Offer the decorated credential',
			summary:
				'We will offer the wallet a well-formed Open Badges credential carrying an image, a detailed achievement, criteria and an alignment. Accepting it is correct — the questions are about how faithfully the wallet then shows it.',
			action: { kind: 'issue', credential: 'rich-ob3' },
			requirements: [
				{
					id: 'exchange-complete',
					statement: 'The exchange completed.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'exchange-reached-complete' }
				},
				{
					id: 'image-rendered',
					statement: 'How did the wallet show the badge image?',
					level: 'SHOULD',
					check: {
						kind: 'attested',
						answer: {
							kind: 'choose',
							options: [
								{ value: 'not-shown', label: 'It showed no image' },
								{ value: 'broken', label: 'A broken or placeholder image' },
								{ value: 'rendered', label: 'The image rendered' }
							],
							correct: 'rendered'
						}
					}
				},
				{
					id: 'achievement-legible',
					statement: 'How did the wallet present the achievement?',
					level: 'SHOULD',
					check: {
						kind: 'attested',
						answer: {
							kind: 'choose',
							options: [
								{ value: 'nothing', label: 'Nothing' },
								{ value: 'raw-json', label: 'A raw JSON blob' },
								{ value: 'name-only', label: 'The name only' },
								{ value: 'name-and-description', label: 'The name and its description' }
							],
							correct: 'name-and-description'
						}
					}
				},
				{
					id: 'issuer-shown',
					statement: 'The wallet showed the issuer’s name.',
					level: 'SHOULD',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				}
			]
		}
	]
});
