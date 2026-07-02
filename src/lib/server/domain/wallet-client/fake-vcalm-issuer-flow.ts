import type { IssuerFlowRunResult, VcalmIssuerFlow } from './drivers/vcalm-issuer-flow.js';

const HOLDER_DID = 'did:key:z6MkfakeHolder0000000000000000000000000000000000';
const ISSUER_DID = 'did:key:z6MkfakeIssuer0000000000000000000000000000000000';

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

/**
 * Deterministic in-memory {@link VcalmIssuerFlow} for route tests / stories that don't exercise
 * real crypto or network. Returns a fully-successful run (all four steps observed, a
 * conformance-passing credential) by default; pass an override to shape a failing/blocked run.
 */
export function FakeVcalmIssuerFlow(override?: Partial<IssuerFlowRunResult>): VcalmIssuerFlow {
	async function runIssuerFlow(): Promise<IssuerFlowRunResult> {
		const credential = fakeCredential();
		return {
			blocked: false,
			observations: {
				interaction: {
					ok: true,
					status: 200,
					protocols: { vcapi: 'https://issuer.test/vcapi/ex-1' },
					vcapiUrl: 'https://issuer.test/vcapi/ex-1',
					tls: { ok: true, protocol: 'TLSv1.3', atLeastTls12: true },
					rawBody: { protocols: { vcapi: 'https://issuer.test/vcapi/ex-1' } }
				},
				didAuth: {
					status: 200,
					challenge: 'challenge-ex-1',
					domain: 'https://issuer.test',
					vpr: { query: { type: 'DIDAuthentication' }, challenge: 'challenge-ex-1' }
				},
				delivery: {
					status: 200,
					credential,
					holderDid: HOLDER_DID,
					presentation: { type: ['VerifiablePresentation'], holder: HOLDER_DID }
				},
				holder: { did: HOLDER_DID, cryptosuite: 'eddsa-rdfc-2022' },
				verify: { verified: true, cryptosuite: 'eddsa-rdfc-2022', issuerDid: ISSUER_DID }
			},
			...override
		};
	}

	return { runIssuerFlow };
}
export type FakeVcalmIssuerFlow = ReturnType<typeof FakeVcalmIssuerFlow>;
