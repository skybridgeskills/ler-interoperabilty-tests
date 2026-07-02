import type { CheckCtx, CheckFn, CheckResult } from './types.js';

/**
 * Check functions for the OB 3.0 Direct Delivery issuer checklist.
 * Keys match the `id` field on requirements in
 * `src/lib/interop/profiles/ob3-direct-delivery/issuer-direct-credential-issuance.ts`.
 *
 * Each function reads the parsed credential and/or the verifier-core
 * result and returns `{ status, message }`. The check-runner adds
 * `id` + `level` from the requirement when wrapping into a full
 * `CheckOutcome`.
 */
export const ob3DirectDeliveryIssuerChecks: Record<string, CheckFn> = {
	'ob3-direct-delivery.auth.secure-login': () => ({
		status: 'n/a',
		message:
			'Authentication happens server-side at the issuer; cannot be inspected from the credential.'
	}),

	'ob3-direct-delivery.auth.verify-identity': () => ({
		status: 'n/a',
		message: 'Identity verification is a process step at the issuer; not visible in the credential.'
	}),

	'ob3-direct-delivery.vc-data-model-v2-compliant': ({ credential }) => {
		const cred = credential as Record<string, unknown> | null;
		if (!cred) return { status: 'fail', message: 'Credential is not an object.' };
		const context = cred['@context'];
		const types = cred.type;
		const hasV2Context =
			Array.isArray(context) && context.includes('https://www.w3.org/ns/credentials/v2');
		const hasVcType = Array.isArray(types) && types.includes('VerifiableCredential');
		if (!hasV2Context) {
			return {
				status: 'fail',
				message: '`@context` MUST include `https://www.w3.org/ns/credentials/v2`.'
			};
		}
		if (!hasVcType) {
			return { status: 'fail', message: '`type` MUST include `VerifiableCredential`.' };
		}
		return { status: 'pass', message: 'VC Data Model 2.0 context and type present.' };
	},

	'ob3-direct-delivery.openbadgecredential-type': ({ credential }) => {
		const cred = credential as Record<string, unknown> | null;
		const types = cred?.type;
		if (Array.isArray(types) && types.includes('OpenBadgeCredential')) {
			return { status: 'pass', message: '`type` includes `OpenBadgeCredential`.' };
		}
		return { status: 'fail', message: '`type` MUST include `OpenBadgeCredential`.' };
	},

	'ob3-direct-delivery.subject-id-is-email': ({ credential }) => {
		const subject = subjectOf(credential);
		const id = subject?.id;
		if (typeof id !== 'string') {
			return { status: 'fail', message: '`credentialSubject.id` is missing or not a string.' };
		}
		if (id.startsWith('mailto:') && id.length > 'mailto:'.length) {
			return { status: 'pass', message: 'credentialSubject.id is a mailto: URI.' };
		}
		// Allow bare emails too (some issuers emit `learner@example.edu`).
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
			return {
				status: 'warn',
				message:
					'credentialSubject.id looks like an email but should be a `mailto:` URI per OB 3.0.'
			};
		}
		return {
			status: 'fail',
			message:
				'credentialSubject.id MUST be an email-based identifier (e.g. `mailto:learner@example.edu`).'
		};
	},

	'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022': ({ credential }) => {
		const proof = (credential as Record<string, unknown> | null)?.proof as
			| Record<string, unknown>
			| undefined;
		if (!proof) return { status: 'fail', message: '`proof` is missing.' };
		if (proof.type !== 'DataIntegrityProof') {
			return { status: 'fail', message: '`proof.type` MUST be `DataIntegrityProof`.' };
		}
		if (proof.cryptosuite !== 'eddsa-rdfc-2022') {
			return {
				status: 'fail',
				message: '`proof.cryptosuite` MUST be `eddsa-rdfc-2022`.'
			};
		}
		if (typeof proof.created !== 'string' || Number.isNaN(Date.parse(proof.created))) {
			return { status: 'fail', message: '`proof.created` MUST be an ISO date string.' };
		}
		if (typeof proof.verificationMethod !== 'string') {
			return { status: 'fail', message: '`proof.verificationMethod` MUST be a string.' };
		}
		return {
			status: 'pass',
			message:
				'eddsa-rdfc-2022 DataIntegrityProof present with creation date + verification method.'
		};
	},

	'ob3-direct-delivery.bitstring-status-list-entry': ({ credential }) => {
		const status = (credential as Record<string, unknown> | null)?.credentialStatus as
			| Record<string, unknown>
			| undefined;
		if (!status) {
			return {
				status: 'fail',
				message: '`credentialStatus` is required for a Bitstring Status List entry.'
			};
		}
		const type = status.type;
		const typeOk =
			type === 'BitstringStatusListEntry' ||
			(Array.isArray(type) && type.includes('BitstringStatusListEntry'));
		if (!typeOk) {
			return {
				status: 'fail',
				message: '`credentialStatus.type` MUST include `BitstringStatusListEntry`.'
			};
		}
		if (typeof status.statusListCredential !== 'string') {
			return { status: 'fail', message: '`credentialStatus.statusListCredential` is missing.' };
		}
		if (typeof status.statusListIndex !== 'string') {
			return { status: 'fail', message: '`credentialStatus.statusListIndex` is missing.' };
		}
		return { status: 'pass', message: 'Bitstring Status List entry present.' };
	},

	'ob3-direct-delivery.issuer-did-method': ({ credential }) => issuerDidMethodCheck(credential),

	'ob3-direct-delivery.valid-until-optional': ({ credential }) => {
		const validUntil = (credential as Record<string, unknown> | null)?.validUntil;
		if (validUntil === undefined) {
			return {
				status: 'n/a',
				message: '`validUntil` not set; credential does not declare an expiration.'
			};
		}
		if (typeof validUntil === 'string' && !Number.isNaN(Date.parse(validUntil))) {
			return { status: 'pass', message: '`validUntil` present and parseable.' };
		}
		return { status: 'fail', message: '`validUntil` is present but not a valid ISO date string.' };
	},

	'ob3-direct-delivery.status-list-revocation-updates': () => ({
		status: 'n/a',
		message:
			'Whether the issuer updates the status list on revocation is not visible from a single credential.'
	}),

	'ob3-direct-delivery.delivery.downloadable-file': () => ({
		status: 'n/a',
		message: 'Delivery affordance is a property of the issuer system, not the credential JSON.'
	}),
	'ob3-direct-delivery.delivery.copy-paste-text': () => ({
		status: 'n/a',
		message: 'Delivery affordance is a property of the issuer system, not the credential JSON.'
	}),
	'ob3-direct-delivery.delivery.recipient-can-share': () => ({
		status: 'n/a',
		message: 'Delivery affordance is a property of the issuer system, not the credential JSON.'
	}),
	'ob3-direct-delivery.delivery.file-format-validation': () => ({
		status: 'n/a',
		message: 'File-format validation is a property of the issuer system, not the credential JSON.'
	})
};

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Shared issuer DID-method check: `issuer` may be a string or an object
 * with an `id`; the identifier MUST use `did:web` or `did:key`. Reused
 * by the data-integrity-cryptosuites additive issuer check.
 */
function issuerDidMethodCheck(credential: unknown): CheckResult {
	const issuer = (credential as Record<string, unknown> | null)?.issuer;
	const id =
		typeof issuer === 'string'
			? issuer
			: typeof (issuer as Record<string, unknown> | null)?.id === 'string'
				? (issuer as { id: string }).id
				: undefined;
	if (!id) return { status: 'fail', message: '`issuer.id` MUST be present.' };
	if (id.startsWith('did:web:') || id.startsWith('did:key:')) {
		return { status: 'pass', message: `Issuer uses ${id.split(':').slice(0, 2).join(':')}.` };
	}
	return {
		status: 'fail',
		message: 'Issuer DID MUST use the `did:web` or `did:key` method.'
	};
}

function subjectOf(credential: unknown): Record<string, unknown> | undefined {
	const cred = credential as Record<string, unknown> | null;
	const subject = cred?.credentialSubject;
	if (!subject) return undefined;
	// OB 3.0 allows either an object or an array of objects.
	if (Array.isArray(subject)) return subject[0] as Record<string, unknown> | undefined;
	return subject as Record<string, unknown>;
}

// Re-export helpers for the additive-profile checks.
export { subjectOf, issuerDidMethodCheck };

// Re-export the type so the registry can be typed without circular imports.
export type { CheckCtx, CheckResult };
