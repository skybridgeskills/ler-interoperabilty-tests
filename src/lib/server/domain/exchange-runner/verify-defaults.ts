/**
 * The fixed presentation-request defaults the suite uses when it creates a
 * verify exchange. The suite verifies exactly one credential shape today —
 * an Open Badges 3.0 credential — so these are constants rather than
 * caller-supplied inputs (YAGNI: no `trustedIssuers`/`vprClaims` yet).
 *
 * `vprContext` carries the OB3 v3p0 context URL, mirroring the
 * `@context` of the OB3 fixtures (`credential-fixtures/`,
 * `ob3-credential-template.ts`) so the transaction service's
 * QueryByExample selects the credential the wallet presents.
 */

/** OB3 v3p0 JSON-LD context — kept in sync with the OB3 credential fixtures. */
export const OB3_CONTEXT_URL = 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json';

/** Fixed suite defaults for a verify (presentation) exchange. */
export const suiteVerifyDefaults: { vprCredentialType: string[]; vprContext: string[] } = {
	vprCredentialType: ['OpenBadgeCredential'],
	vprContext: [OB3_CONTEXT_URL]
};
