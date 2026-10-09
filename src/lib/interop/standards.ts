import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/** Stable id for a standard in the register. */
export const StandardId = ZodFactory(
	z.enum([
		'ob-3',
		'vcdm-2',
		'vc-di-1',
		'vc-di-eddsa-1',
		'vc-di-ecdsa-1',
		'bsl-1',
		'cid-1',
		'did-core-1',
		'did-web',
		'did-key',
		'oid4vci-1',
		'oid4vp-1',
		'vcalm-1',
		'pex-2',
		'rfc-8414'
	])
);
export type StandardId = ReturnType<typeof StandardId>;

/**
 * An external published specification a Standard Profile is built on and a
 * scenario tests against. **One `url` per standard: the version-named one**,
 * never a dated snapshot — fixing link rot is then one line here. Specs that
 * only exist evergreen (VCALM's Working Draft, did:web, did:key) take their
 * evergreen URL, and `status` says what kind of document it is.
 */
export const Standard = ZodFactory(
	z.object({
		id: StandardId.schema,
		/** Full title, e.g. "Verifiable Credentials Data Model v2.0". */
		name: z.string().min(1),
		/** What the UI prints: "VCDM 2.0", "OID4VCI 1.0". */
		shortName: z.string().min(1),
		version: z.string().min(1),
		/** What kind of document: "W3C Recommendation", "OpenID Final", "CCG draft", … */
		status: z.string().min(1),
		url: z.string().url()
	})
);
export type Standard = ReturnType<typeof Standard>;

/**
 * A pointer into a standard. `section` is a **bare anchor** (`section-3.5`,
 * `verify-proof`) — never a `#` or a URL — and `label` its human name
 * ("§3.5 Pre-Authorized Code Flow"). Both optional: a document-level citation
 * is honest where no section is normative.
 */
export const StandardCitation = ZodFactory(
	z.object({
		standard: StandardId.schema,
		section: z
			.string()
			.regex(/^[^#/\s]+$/)
			.optional(),
		label: z.string().min(1).optional()
	})
);
export type StandardCitation = ReturnType<typeof StandardCitation>;

/** The register. URLs verified 2026-10-08 (planning research, `standards-links.md` § 1b). */
export const allStandards: Standard[] = [
	Standard({
		id: 'ob-3',
		name: 'Open Badges Specification 3.0',
		shortName: 'OB 3.0',
		version: '3.0',
		status: '1EdTech Final Release',
		url: 'https://www.imsglobal.org/spec/ob/v3p0/main/'
	}),
	Standard({
		id: 'vcdm-2',
		name: 'Verifiable Credentials Data Model v2.0',
		shortName: 'VCDM 2.0',
		version: '2.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/vc-data-model-2.0/'
	}),
	Standard({
		id: 'vc-di-1',
		name: 'Verifiable Credential Data Integrity 1.0',
		shortName: 'VC Data Integrity 1.0',
		version: '1.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/vc-data-integrity/'
	}),
	Standard({
		id: 'vc-di-eddsa-1',
		name: 'Data Integrity EdDSA Cryptosuites v1.0',
		shortName: 'DI EdDSA 1.0',
		version: '1.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/vc-di-eddsa/'
	}),
	Standard({
		id: 'vc-di-ecdsa-1',
		name: 'Data Integrity ECDSA Cryptosuites v1.0',
		shortName: 'DI ECDSA 1.0',
		version: '1.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/vc-di-ecdsa/'
	}),
	Standard({
		id: 'bsl-1',
		name: 'Bitstring Status List v1.0',
		shortName: 'Bitstring Status List 1.0',
		version: '1.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/vc-bitstring-status-list/'
	}),
	Standard({
		id: 'cid-1',
		name: 'Controlled Identifiers v1.0',
		shortName: 'Controlled Identifiers 1.0',
		version: '1.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/cid-1.0/'
	}),
	Standard({
		id: 'did-core-1',
		name: 'Decentralized Identifiers (DIDs) v1.0',
		shortName: 'DID Core 1.0',
		version: '1.0',
		status: 'W3C Recommendation',
		url: 'https://www.w3.org/TR/did-core/'
	}),
	Standard({
		id: 'did-web',
		name: 'did:web Method Specification',
		shortName: 'did:web',
		version: 'unversioned',
		status: 'W3C CCG unofficial draft',
		url: 'https://w3c-ccg.github.io/did-method-web/'
	}),
	Standard({
		id: 'did-key',
		name: 'The did:key Method v0.9',
		shortName: 'did:key 0.9',
		version: '0.9',
		status: 'W3C CCG draft',
		url: 'https://w3c-ccg.github.io/did-key-spec/'
	}),
	Standard({
		id: 'oid4vci-1',
		name: 'OpenID for Verifiable Credential Issuance 1.0',
		shortName: 'OID4VCI 1.0',
		version: '1.0',
		status: 'OpenID Final',
		url: 'https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html'
	}),
	Standard({
		id: 'oid4vp-1',
		name: 'OpenID for Verifiable Presentations 1.0',
		shortName: 'OID4VP 1.0',
		version: '1.0',
		status: 'OpenID Final',
		url: 'https://openid.net/specs/openid-4-verifiable-presentations-1_0.html'
	}),
	Standard({
		id: 'vcalm-1',
		name: 'VCALM v1.0: A Verifiable Credential API for Lifecycle Management',
		shortName: 'VCALM 1.0',
		version: '1.0',
		status: 'W3C Working Draft',
		url: 'https://www.w3.org/TR/vcalm-1.0/'
	}),
	Standard({
		id: 'pex-2',
		name: 'DIF Presentation Exchange v2.1.1',
		shortName: 'DIF PEX 2.1.1',
		version: '2.1.1',
		status: 'DIF Ratified',
		url: 'https://identity.foundation/presentation-exchange/spec/v2.1.1/'
	}),
	Standard({
		id: 'rfc-8414',
		name: 'RFC 8414: OAuth 2.0 Authorization Server Metadata',
		shortName: 'RFC 8414',
		version: 'RFC 8414',
		status: 'IETF Proposed Standard',
		url: 'https://www.rfc-editor.org/rfc/rfc8414.html'
	})
];

/** The register entry for an id. Every `StandardId` has one (tested). */
export function standardById(id: StandardId): Standard {
	const standard = allStandards.find((s) => s.id === id);
	if (!standard) throw new Error(`No standard registered for "${id}"`);
	return standard;
}

/** Where a citation points: the standard's URL, plus `#section` when it has one. */
export function citationHref(citation: StandardCitation): string {
	const { url } = standardById(citation.standard);
	return citation.section ? `${url}#${citation.section}` : url;
}

/** What a citation reads as: "OID4VCI 1.0 §3.5 Pre-Authorized Code Flow". */
export function citationText(citation: StandardCitation): string {
	const { shortName } = standardById(citation.standard);
	return citation.label ? `${shortName} ${citation.label}` : shortName;
}
