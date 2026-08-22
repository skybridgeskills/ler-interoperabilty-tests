import type { Requirement } from './requirement-schema.js';

/**
 * The seven requirements both wallet-presentation scenarios declare.
 *
 * Declared once, the way the issuer migration declared the Open Skill Alignment
 * rows once, so a later edit cannot silently split the two protocols apart. The
 * scenarios ask the same question of the same wallet over two transports, and a
 * reader comparing an OID4 result with a VCALM one must be comparing like with
 * like. Requirement ids are scenario-scoped, so sharing them across profiles is
 * an authoring choice with no catalog constraint behind it — and it is the right
 * choice: a VCALM presentation is as inspectable through `results.default` as an
 * OID4VP one.
 *
 * **Twenty-two checklist rows collapse to these seven.** Five are wire truth,
 * read off the exchange the suite observed as verifier. Two are attested,
 * because the exchange structurally cannot see them. `mapping.md` §§ 3, 4 and 7
 * record where every dropped and merged row went; the three decisions worth
 * repeating here:
 *
 * - **`vp-delivered` absorbs five rows.** `accept-unsigned-request`,
 *   `parse-request`, `interaction-url-support`, `initiate-exchange` and
 *   `process-request` cannot fail independently of it: the suite mints only an
 *   unsigned `redirect_uri` request, so a matching presentation arriving *is*
 *   the proof the request was reached, accepted, parsed and answered.
 *
 * - **Consent and the presentation interface are attested, reversing the
 *   black-box ADR.** That ADR held them at `n/a` and argued explicitly against
 *   attesting them — weighing operator burden against a third status that the
 *   scenario model does not have. With `n/a` gone the choice is attest or drop,
 *   and the issuer migration drew the line: attested re-homes an observation of
 *   the run just performed; a standing property, or a row needing a probe we do
 *   not run, is dropped. The operator just watched their wallet ask (or not
 *   ask) for consent.
 *
 * - **TLS is dropped.** The suite hosts the endpoint here, so faulting a wallet
 *   for accepting plaintext would need us to *offer* plaintext — a negative
 *   probe the suite does not run. An unrunnable row is not coverage.
 */
export const walletPresentationRequirements: Requirement[] = [
	{
		id: 'vp-delivered',
		statement: 'Your wallet sent a presentation to the verifier.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'wallet-vp-delivered' }
	},
	{
		id: 'di-vp-not-jwt',
		statement: 'Your wallet sent a Data Integrity presentation, not a JWT.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'wallet-vp-di-not-jwt' }
	},
	{
		id: 'vp-signature-valid',
		statement: 'The presentation’s signature verified against your wallet’s key.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'wallet-vp-signature-valid' }
	},
	{
		id: 'proof-binding',
		statement: 'Your wallet bound the presentation to this request, and to this verifier.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'wallet-vp-proof-binding' }
	},
	{
		id: 'preserve-proofs',
		statement: 'The credential inside still carried its issuer’s original signature.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'wallet-vp-preserves-vc-proofs' }
	},
	{
		id: 'user-consent',
		statement: 'Your wallet asked you to confirm before it shared anything.',
		level: 'MUST',
		check: { kind: 'attested', answer: { kind: 'affirm' } }
	},
	{
		id: 'presentation-interface',
		statement: 'Your wallet showed you which credential it was about to share.',
		level: 'MUST',
		check: { kind: 'attested', answer: { kind: 'affirm' } }
	}
];
