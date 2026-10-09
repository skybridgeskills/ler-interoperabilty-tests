import type { StandardCitation } from '$lib/interop/standards.js';

/**
 * The section citations scenarios point at, named once. Every anchor here was
 * found as an `id=` in the fetched spec (planning research,
 * `standards-links.md` § 3, re-checked 2026-10-09), and each label is the
 * section's own number and title. Scenario-level only: a scenario cites the one to
 * three sections it rests on, never a step or a requirement.
 */
export const cite = {
	// Open Badges 3.0
	obVerification: {
		standard: 'ob-3',
		section: 'verification',
		label: '§9.1 OpenBadgeCredential Verification'
	},
	obAchievementCredential: {
		standard: 'ob-3',
		section: 'achievementcredential',
		label: 'B.1.2 AchievementCredential'
	},
	obIdentityObject: { standard: 'ob-3', section: 'identityobject', label: 'B.1.12 IdentityObject' },
	obResultDescription: {
		standard: 'ob-3',
		section: 'resultdescription',
		label: 'B.1.17 ResultDescription'
	},
	obResult: { standard: 'ob-3', section: 'result', label: 'B.1.16 Result' },
	obCredentialEngineAlignment: {
		standard: 'ob-3',
		section: 'achievement-alignment-credential-engine',
		label: 'D.5 Achievement Alignment (Credential Engine)'
	},
	/** No spec mandates rendering; the data model describes what there is to render. */
	obDocument: { standard: 'ob-3' },

	// VCDM 2.0, Data Integrity and the cryptosuites
	vcdmValidityPeriod: {
		standard: 'vcdm-2',
		section: 'validity-period',
		label: '§4.9 Validity Period'
	},
	diVerifyProof: { standard: 'vc-di-1', section: 'verify-proof', label: '§4.4 Verify Proof' },
	diProofs: { standard: 'vc-di-1', section: 'proofs', label: '§2.1 Proofs' },
	bslEntry: {
		standard: 'bsl-1',
		section: 'bitstringstatuslistentry',
		label: '§2.1 BitstringStatusListEntry'
	},
	multikey: { standard: 'cid-1', section: 'Multikey', label: '§2.2.2 Multikey' },

	// OID4VCI 1.0
	vciPreAuthorizedCode: {
		standard: 'oid4vci-1',
		section: 'section-3.5',
		label: '§3.5 Pre-Authorized Code Flow'
	},
	vciBinding: {
		standard: 'oid4vci-1',
		section: 'section-8.1',
		label: '§8.1 Binding the Issued Credential'
	},
	vciMetadataRetrieval: {
		standard: 'oid4vci-1',
		section: 'section-12.2.2',
		label: '§12.2.2 Credential Issuer Metadata Retrieval'
	},
	vciDiVpKeyProof: {
		standard: 'oid4vci-1',
		section: 'appendix-F.2',
		label: 'App. F.2 di_vp Proof Type'
	},

	// OID4VP 1.0
	vpAuthorizationRequest: {
		standard: 'oid4vp-1',
		section: 'section-5',
		label: '§5 Authorization Request'
	},
	vpDcql: { standard: 'oid4vp-1', section: 'section-6', label: '§6 DCQL' },
	vpDirectPost: {
		standard: 'oid4vp-1',
		section: 'section-8.2',
		label: '§8.2 Response Mode direct_post'
	},
	vpReplayProtection: {
		standard: 'oid4vp-1',
		section: 'section-14.1.2',
		label: '§14.1.2 Replay protection for presentations'
	},

	// VCALM 1.0 — VPR, QueryByExample and DIDAuthentication live in §3.4 now
	vcalmDidAuthentication: {
		standard: 'vcalm-1',
		section: 'did-authentication',
		label: '§3.4.3 DID Authentication'
	},
	vcalmDidAuthenticationResponse: {
		standard: 'vcalm-1',
		section: 'the-did-authentication-response-format',
		label: '§3.4.3.2 The DID Authentication Response Format'
	},
	vcalmQueryByExample: {
		standard: 'vcalm-1',
		section: 'query-by-example',
		label: '§3.4.2 Query By Example'
	},
	vcalmParticipate: {
		standard: 'vcalm-1',
		section: 'participate-in-an-exchange',
		label: '§3.6.6 Participate in an Exchange'
	},
	vcalmInteractionUrl: {
		standard: 'vcalm-1',
		section: 'interaction-url-format',
		label: '§3.7.1 Interaction URL Format'
	},
	vcalmProtocolsResponse: {
		standard: 'vcalm-1',
		section: 'interaction-protocols-response',
		label: '§3.7.4 Interaction Protocols Response'
	},

	// DIF Presentation Exchange — the PEX arm is a compatibility probe outside OID4VP 1.0
	pexPresentationDefinition: {
		standard: 'pex-2',
		section: 'presentation-definition',
		label: 'Presentation Definition'
	},
	pexLimitedDisclosure: {
		standard: 'pex-2',
		section: 'limited-disclosure-submissions',
		label: 'Limited Disclosure Submissions'
	},

	// RFC 8414
	rfc8414MetadataRequest: {
		standard: 'rfc-8414',
		section: 'section-3.1',
		label: '§3.1 Authorization Server Metadata Request'
	}
} as const satisfies Record<string, StandardCitation>;

/** A cryptosuite's own section, for the scenarios that sign with it. */
export function suiteCitation(suite: 'eddsa' | 'ecdsa'): StandardCitation {
	return suite === 'eddsa'
		? { standard: 'vc-di-eddsa-1', section: 'eddsa-rdfc-2022', label: '§3.2 eddsa-rdfc-2022' }
		: { standard: 'vc-di-ecdsa-1', section: 'ecdsa-rdfc-2019', label: '§3.2 ecdsa-rdfc-2019' };
}

/** A cryptosuite's verification algorithm, for the scenarios that verify one. */
export function suiteVerifyCitation(suite: 'eddsa' | 'ecdsa'): StandardCitation {
	return suite === 'eddsa'
		? {
				standard: 'vc-di-eddsa-1',
				section: 'verify-proof-eddsa-rdfc-2022',
				label: '§3.2.2 Verify Proof (eddsa-rdfc-2022)'
			}
		: {
				standard: 'vc-di-ecdsa-1',
				section: 'verify-proof-ecdsa-rdfc-2019',
				label: '§3.2.2 Verify Proof (ecdsa-rdfc-2019)'
			};
}
