import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, identifiersOf, NO_CREDENTIAL, subjectOf } from './credential-shape.js';

/** An address-shaped string. The same test the `mailto:` check this replaces used. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The shape the profile asks for, quoted in every fail message so the fix is obvious. */
const WANTED =
	'`credentialSubject.identifier` must carry `{ "type": "IdentityObject", "identityType": "emailAddress", "hashed": false, "identityHash": "<the address>" }`.';

/**
 * The credential names its recipient with an **unhashed** Open Badges 3.0
 * `emailAddress` `IdentityObject` (OB 3.0 § B.1.12).
 *
 * **This is claim-based binding, and that is the point.** The address is a claim
 * the issuer makes about the recipient; it is *not* cryptographically verifiable
 * inside a presentation, and confirming it happens out of band. That trade is
 * what this profile is about, which is why this row is a MUST about the *shape*
 * of the identifier and never about proof of control. See
 * `docs/adr/2026-08-21-claim-based-holder-binding.md`.
 *
 * **Unhashed is deliberate.** These credentials are not published anywhere, so
 * the spec's privacy argument for an `IdentityHash` does not apply here; and a
 * hashed identifier forces exact-case matching against email systems that are
 * overwhelmingly case-insensitive, which is miserable in practice. A hashed
 * identifier therefore **fails**, with that reason in the message.
 *
 * **Supersedes the M11 `credential-subject-email` resolution.** That check read
 * `credentialSubject.id` and failed anything but a `mailto:` URI — including a
 * bare email, which the engine had returned `warn` for. Reversing it is not a
 * regression: `credentialSubject.id` was the wrong place to look. This check
 * does not read `credentialSubject.id` at all, and a `mailto:` URI there is
 * neither required nor discouraged.
 */
export const credentialSubjectIdentifierEmail: AutomaticCheck = {
	id: 'credential-subject-identifier-email',
	summary: 'The credential identifies its recipient with an unhashed `emailAddress` identifier.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };

		const subject = subjectOf(credential);
		if (!subject) {
			return { met: false, detail: 'The credential carries no readable `credentialSubject`.' };
		}

		const identifiers = identifiersOf(subject);
		if (identifiers.length === 0) {
			return {
				met: false,
				detail: `Your credential carries no \`credentialSubject.identifier\`. ${WANTED}`
			};
		}

		// Any one conforming entry satisfies the row — a credential may name its
		// recipient several ways, and one good email identifier is what we need.
		const identityObjects = identifiers.filter(isIdentityObject);
		const emails = identityObjects.filter((entry) => entry.identityType === 'emailAddress');

		if (emails.length === 0) {
			return { met: false, detail: `${noEmailReason(identifiers, identityObjects)} ${WANTED}` };
		}

		if (emails.some((entry) => entry.hashed === false && isAddress(entry.identityHash))) {
			return {
				met: true,
				detail:
					'Your credential names its recipient with an unhashed `emailAddress` `IdentityObject`. That address is a claim — it is confirmed out of band, not by the presentation.'
			};
		}

		if (emails.some((entry) => entry.hashed === true)) {
			return {
				met: false,
				detail:
					'Your `emailAddress` identifier is hashed. This profile asks for the plaintext address (`"hashed": false`): these credentials are not published anywhere, so hashing buys no privacy here, and it forces exact-case matching against email systems that are case-insensitive.'
			};
		}

		if (emails.some((entry) => typeof entry.hashed !== 'boolean')) {
			return {
				met: false,
				detail:
					'Your `emailAddress` identifier declares no `hashed` value. `hashed` is required, and this profile needs it to be `false` — without it there is no way to tell a plaintext address from a digest.'
			};
		}

		return {
			met: false,
			detail: `Your \`emailAddress\` identifier's \`identityHash\` is ${describe(emails[0].identityHash)}, which is not an email address. ${WANTED}`
		};
	}
};

/** `type` must be the IRI `IdentityObject`; tolerate the array form, as every `type` read here does. */
function isIdentityObject(entry: Record<string, unknown>): boolean {
	const type = entry.type;
	return type === 'IdentityObject' || (Array.isArray(type) && type.includes('IdentityObject'));
}

function isAddress(value: unknown): boolean {
	return typeof value === 'string' && EMAIL.test(value);
}

/** Say what was found instead, so the operator does not have to guess which entry we read. */
function noEmailReason(
	identifiers: Record<string, unknown>[],
	identityObjects: Record<string, unknown>[]
): string {
	if (identityObjects.length === 0) {
		return `None of your \`credentialSubject.identifier\` entries declares \`"type": "IdentityObject"\` (${identifiers.length} entry/entries seen).`;
	}
	const found = identityObjects
		.map((entry) =>
			typeof entry.identityType === 'string' ? entry.identityType : 'no identityType'
		)
		.join(', ');
	return `Your identifiers declare ${found} — none of them \`emailAddress\`.`;
}

/** A short, safe description of a value for a message: quote a string, else name its type. */
function describe(value: unknown): string {
	if (typeof value === 'string') return `\`${value}\``;
	return value === undefined ? 'missing' : `a ${Array.isArray(value) ? 'array' : typeof value}`;
}
