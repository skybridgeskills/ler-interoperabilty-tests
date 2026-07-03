import type {
	Oid4IssuerFlow,
	Oid4IssuerFlowRunResult,
	Oid4StepObservation
} from './drivers/oid4-issuer-flow.js';

const ISSUER = 'https://issuer.test/workflows/claim/exchanges/ex-1';
const HOLDER_DID = 'did:key:z6MkfakeHolder0000000000000000000000000000000000';
const ISSUER_DID = 'did:key:z6MkfakeIssuer0000000000000000000000000000000000';
const C_NONCE = 'c-nonce-fake-ex-1';
const CREDENTIAL_ENDPOINT = `${ISSUER}/credential`;
const NONCE_ENDPOINT = `${ISSUER}/nonce`;
const TOKEN_ENDPOINT = `${ISSUER}/token`;
const OFFER_URL = `openid-credential-offer://?credential_offer=${encodeURIComponent(
	JSON.stringify({ credential_issuer: ISSUER })
)}`;

/** A plausible OB 3.0 credential that satisfies every issuer-flow credential check. */
function fakeCredential(): Record<string, unknown> {
	return {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: ISSUER_DID,
		validFrom: '2026-01-01T00:00:00Z',
		validUntil: '2027-01-01T00:00:00Z',
		credentialSubject: { id: HOLDER_DID, type: 'AchievementSubject' },
		credentialStatus: {
			type: 'BitstringStatusListEntry',
			statusPurpose: 'revocation',
			statusListIndex: '4',
			statusListCredential: 'https://issuer.test/status/1'
		},
		proof: {
			type: 'DataIntegrityProof',
			cryptosuite: 'eddsa-rdfc-2022',
			created: '2026-01-01T00:00:00Z',
			verificationMethod: `${ISSUER_DID}#${ISSUER_DID.slice('did:key:'.length)}`,
			proofPurpose: 'assertionMethod',
			proofValue: 'zFakeProofValue'
		}
	};
}

function fakeTranscript(): Oid4StepObservation[] {
	const issuerMetaUrl =
		'https://issuer.test/.well-known/openid-credential-issuer/workflows/claim/exchanges/ex-1';
	const asMetaUrl =
		'https://issuer.test/.well-known/oauth-authorization-server/workflows/claim/exchanges/ex-1';
	return [
		{
			name: 'issuer-metadata',
			method: 'GET',
			url: issuerMetaUrl,
			ok: true,
			status: 200,
			responseBody: {
				credential_issuer: ISSUER,
				credential_endpoint: CREDENTIAL_ENDPOINT,
				nonce_endpoint: NONCE_ENDPOINT
			}
		},
		{
			name: 'as-metadata',
			method: 'GET',
			url: asMetaUrl,
			ok: true,
			status: 200,
			responseBody: { token_endpoint: TOKEN_ENDPOINT }
		},
		// The access token is redacted from the transcript — only `token_type` survives.
		{
			name: 'token',
			method: 'POST',
			url: TOKEN_ENDPOINT,
			ok: true,
			status: 200,
			responseBody: { token_type: 'bearer', c_nonce: C_NONCE }
		},
		{
			name: 'credential',
			method: 'POST',
			url: CREDENTIAL_ENDPOINT,
			ok: true,
			status: 200,
			responseBody: { credential: fakeCredential() }
		}
	];
}

/**
 * Deterministic in-memory {@link Oid4IssuerFlow} for route tests / stories that don't exercise real
 * crypto or network. Returns a fully-successful pre-auth run (offer parsed, metadata with a `di_vp`
 * proof type + signing algs, token redeemed, `c_nonce`, a conformance-passing OB3 credential bound
 * to the holder DID, `verify.verified: true`, TLSv1.3, and a populated transcript) by default; pass
 * an override to shape a failing/blocked run. The access token is never present in the result.
 */
export function FakeOid4IssuerFlow(override?: Partial<Oid4IssuerFlowRunResult>): Oid4IssuerFlow {
	async function runIssuerFlow(): Promise<Oid4IssuerFlowRunResult> {
		const credential = fakeCredential();
		return {
			blocked: false,
			observations: {
				offerUrl: OFFER_URL,
				tls: { ok: true, protocol: 'TLSv1.3', atLeastTls12: true },
				offer: {
					credentialIssuer: ISSUER,
					preAuthCode: 'pre-auth-fake-123',
					configurationId: 'OpenBadgeCredential'
				},
				issuerMeta: {
					credentialEndpoint: CREDENTIAL_ENDPOINT,
					nonceEndpoint: NONCE_ENDPOINT,
					proofTypesSupported: {
						di_vp: { proof_signing_alg_values_supported: ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'] }
					},
					diVpSigningAlgs: ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']
				},
				asMeta: {
					tokenEndpoint: TOKEN_ENDPOINT,
					grantTypesSupported: ['urn:ietf:params:oauth:grant-type:pre-authorized_code']
				},
				token: { redeemed: true, cNonce: C_NONCE },
				nonce: { cNonce: C_NONCE },
				delivery: {
					status: 200,
					credential,
					holderDid: HOLDER_DID,
					presentation: { type: ['VerifiablePresentation'], holder: HOLDER_DID }
				},
				holder: { did: HOLDER_DID, cryptosuite: 'eddsa-rdfc-2022' },
				verify: { verified: true, cryptosuite: 'eddsa-rdfc-2022', issuerDid: ISSUER_DID },
				transcript: fakeTranscript()
			},
			...override
		};
	}

	return { runIssuerFlow };
}
export type FakeOid4IssuerFlow = ReturnType<typeof FakeOid4IssuerFlow>;
