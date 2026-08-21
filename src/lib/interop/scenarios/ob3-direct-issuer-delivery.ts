import { Scenario } from './scenario-schema.js';

/**
 * The OB 3.0 direct-delivery **issuer** scenario — the paste-and-verify probe.
 *
 * One step: the operator issues a credential from their own system and hands it
 * to the suite, which verifies it and reads the payload. "Does the credential
 * your issuer produces conform, and does it verify?" There is no wire here at
 * all, which makes this the cheapest of the three issuer verticals and the one
 * that proves the shared `credential-*` check family the live scenarios reuse.
 *
 * Seven of the nine requirements are `automatic` over the received credential;
 * two are **attested**, and they are the interesting half. `downloadable-file`
 * and `copy-paste-text` were hardcoded `n/a` MUSTs on the checklist this
 * replaces — genuinely unobservable from a pasted credential, and therefore
 * gating nothing. As attested affirms they gate: the operator has just performed
 * the delivery, so they can answer for the run they did, which is exactly the
 * line the scenario model draws between an attested requirement and a dropped
 * one. Five sibling rows are dropped rather than re-homed — standing properties
 * of the operator's platform (`auth.*`), a row needing a revocation probe the
 * suite does not run, and two that restate the delivery affordances.
 *
 * The page this replaces offered a "load sample" button that filled the paste
 * box with one of our own fixtures. It is deliberately **not** carried over:
 * scoring our own sample would record a pass for a credential the operator's
 * issuer never produced.
 */
export const ob3DirectIssuerDelivery = Scenario({
	slug: 'ob3-direct-issuer-delivery',
	name: 'Issue a credential and deliver it directly',
	blurb:
		'Issue an Open Badges credential from your own system and hand it to us. We verify it and read what it carries — plus two questions about how your issuer offered it to you.',
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	memberships: [{ profile: 'ob3-direct-delivery', level: 'required' }],
	steps: [
		{
			id: 'deliver',
			title: 'Issue a credential and paste it here',
			summary:
				'Issue an Open Badges 3.0 credential from your own issuer, download or copy it, and paste the credential JSON below. We verify it and read what it carries.',
			action: { kind: 'receive-from-issuer', transport: 'direct' },
			requirements: [
				{
					id: 'vcdm2',
					statement: 'Your credential declares the VC Data Model 2.0 context and type.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-vcdm2' }
				},
				{
					id: 'ob3-type',
					statement: 'Your credential’s `type` includes `OpenBadgeCredential`.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-ob3-type' }
				},
				{
					id: 'subject-email',
					statement: 'Your credential identifies its subject with a `mailto:` URI.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-subject-email' }
				},
				{
					id: 'eddsa-proof',
					statement: 'Your issuer signed the credential with `eddsa-rdfc-2022`.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-di-proof-eddsa' }
				},
				{
					id: 'status-list',
					statement: 'Your credential carries a Bitstring Status List entry.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-status-list' }
				},
				{
					id: 'issuer-did',
					statement: 'Your issuer’s DID uses a supported method and the credential verifies.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'credential-issuer-did' }
				},
				{
					id: 'valid-until',
					statement: 'Your credential declares an expiration date.',
					level: 'SHOULD',
					check: { kind: 'automatic', checkId: 'credential-valid-until' }
				},
				{
					id: 'downloadable-file',
					statement: 'Your issuer offered this credential as a downloadable JSON file.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				},
				{
					id: 'copy-paste-text',
					statement: 'Your issuer offered this credential as copy-paste JSON text.',
					level: 'MUST',
					check: { kind: 'attested', answer: { kind: 'affirm' } }
				}
			]
		}
	]
});
