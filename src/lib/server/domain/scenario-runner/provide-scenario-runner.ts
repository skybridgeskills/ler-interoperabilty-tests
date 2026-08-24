import { tamperClaimValue, tamperProofValue } from '$lib/server/domain/credential-tamper/index.js';
import {
	receiveDirect,
	receiveFromOid4Issuer,
	receiveFromVcalmIssuer,
	type ReceiveFromIssuerResult
} from '$lib/server/domain/issuer-receive/index.js';
import {
	type PresentToOid4Result,
	type PresentToVcalmResult,
	presentToOid4Verifier,
	presentToVcalmVerifier
} from '$lib/server/domain/verifier-present/index.js';
import {
	makeHttpExchangeFlowTransport,
	Oid4IssuerFlowDriver,
	probeTls,
	VcalmIssuerFlowDriver
} from '$lib/server/domain/wallet-client/index.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import type { ScenarioRunner } from './scenario-runner.js';
import { signDeliverable } from './sign-deliverable.js';
import { RealVerifierCoreClient } from './verifier-core-client.js';

/** Production wiring: a real `WalletCrypto` signs each deliverable and drives each present locally. */
export function provideRealScenarioRunner(): { scenarioRunner: ScenarioRunner } {
	const crypto = WalletCrypto();
	return {
		scenarioRunner: {
			deliverDirect: (args) => signDeliverable(crypto, args),
			present: ({ doc, cryptosuite, tamper, transport, interactionUrl }) =>
				transport === 'oid4vp'
					? presentToOid4Verifier({
							doc,
							cryptosuite,
							...(tamper ? { tamper } : {}),
							input: interactionUrl,
							crypto,
							fetchImpl: fetch,
							probe: probeTls
						})
					: presentToVcalmVerifier({
							doc,
							cryptosuite,
							...(tamper ? { tamper } : {}),
							interactionUrl,
							crypto,
							transport: makeHttpExchangeFlowTransport(),
							probe: probeTls
						}),
			// One branch per transport, each handed its dependency here rather than
			// reaching for `appContext()` from inside a leaf — the same discipline
			// `present` follows with its transport and TLS probe. The two live
			// branches wrap the **existing** protocol drivers and add no protocol code
			// of their own. `RealVerifierCoreClient` is reused at this boundary for
			// the paste intake — it is a client, not a scoring engine, so depending on
			// it costs the leaves none of their independence from the legacy runners.
			receive: ({ transport, keyProofSuite, input }) => {
				if (transport === 'vcalm') {
					return receiveFromVcalmIssuer({
						input,
						keyProofSuite,
						flow: VcalmIssuerFlowDriver({ crypto, transport: makeHttpExchangeFlowTransport() })
					});
				}
				if (transport === 'oid4vci') {
					return receiveFromOid4Issuer({
						input,
						keyProofSuite,
						flow: Oid4IssuerFlowDriver({ crypto })
					});
				}
				return receiveDirect({ input, verify: verifyWithVerifierCore });
			}
		}
	};
}

/** Verify a received credential with `verifier-core`, flattening its log into plain reasons. */
async function verifyWithVerifierCore(
	credential: unknown
): Promise<{ verified: boolean; errors?: string[] }> {
	const result = await RealVerifierCoreClient().verifyCredential({ credential });
	if (result.verified) return { verified: true };
	const failed = (result.log ?? [])
		.filter((step) => !step.valid)
		.map((step) => step.error?.name ?? step.id);
	return { verified: false, ...(failed.length ? { errors: failed } : {}) };
}

/**
 * Test wiring: deterministic, no crypto or network.
 *
 * `deliverDirect` stamps a fixed fake proof and applies the **real** shared
 * tamper helpers, so a test can assert `tamper` was honoured without a signing
 * backend. `present` returns a deterministic `{ request, present }` keyed by
 * `transport`: a clean floor + a landed submission, unless the pasted input
 * carries a sentinel — VCALM: `no-vcapi` fails intake, `miss` reports an
 * un-submitted delivery; OID4VP: `unresolved` fails the request, `jwt-only`
 * pins a JWT-only format, `inline` marks an inline request, `miss` an
 * un-submitted delivery — so route/controller tests can exercise those branches
 * without a network. `receive` is the issuer-intake equivalent: a delivered,
 * verified credential unless the input carries `miss` (nothing delivered) or
 * `unverified` (delivered but rejected by the verifier). The `direct` transport
 * additionally echoes a pasted credential back rather than the canned one, so a
 * test can drive the payload checks with whatever shape it needs. The real signer's and present paths' honesty contracts are
 * proven separately (`sign-deliverable.test.ts`,
 * `present-to-{vcalm,oid4}-verifier.test.ts`).
 */
export function provideFakeScenarioRunner(): { scenarioRunner: ScenarioRunner } {
	return {
		scenarioRunner: {
			// The proof is not real, but the **cryptosuite is echoed** rather than
			// hardcoded: a route that dropped or ignored the caller's choice would
			// otherwise still answer 200 with a plausible-looking credential, and the
			// route tests would prove nothing about what actually got signed.
			deliverDirect: async ({ doc, cryptosuite, tamper }) => {
				const signed: Record<string, unknown> = {
					...doc,
					proof: {
						type: 'DataIntegrityProof',
						cryptosuite,
						proofValue: `z${'A'.repeat(80)}2`
					}
				};
				if (tamper === 'proof') return tamperProofValue(signed);
				if (tamper === 'claim') return tamperClaimValue(signed);
				return signed;
			},
			present: async ({
				transport,
				interactionUrl
			}): Promise<PresentToVcalmResult | PresentToOid4Result> =>
				transport === 'oid4vp' ? fakeOid4Present(interactionUrl) : fakeVcalmPresent(interactionUrl),
			receive: async ({ transport, input }): Promise<ReceiveFromIssuerResult> =>
				fakeReceive(transport, input)
		}
	};
}

/** A well-formed OB3 credential the fake intake hands back, so payload checks have something to read. */
function fakeReceivedCredential(): Record<string, unknown> {
	return {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id: 'urn:uuid:00000000-0000-4000-8000-000000000000',
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: { id: 'did:web:issuer.example', type: 'Profile', name: 'Fake Issuer' },
		validFrom: '2026-01-01T00:00:00Z',
		validUntil: '2027-01-01T00:00:00Z',
		credentialSubject: {
			id: 'did:key:zFakeHolder',
			type: ['AchievementSubject'],
			achievement: {
				id: 'urn:uuid:00000000-0000-4000-8000-00000000000a',
				type: ['Achievement'],
				name: 'Fake Achievement',
				criteria: { narrative: 'Did the thing.' },
				description: 'A fake achievement.'
			}
		},
		credentialStatus: {
			id: 'https://issuer.example/status/1#7',
			type: 'BitstringStatusListEntry',
			statusPurpose: 'revocation',
			statusListIndex: '7',
			statusListCredential: 'https://issuer.example/status/1'
		},
		proof: {
			type: 'DataIntegrityProof',
			cryptosuite: 'eddsa-rdfc-2022',
			proofPurpose: 'assertionMethod',
			verificationMethod: 'did:web:issuer.example#key-1',
			proofValue: `z${'A'.repeat(80)}2`
		}
	};
}

/**
 * Deterministic fake issuer intake; sentinels in the operator's input drive the
 * branches, exactly as `fakeVcalmPresent` / `fakeOid4Present` do for the present
 * side.
 *
 * Shared across all three transports: `miss` delivers nothing, `unverified`
 * delivers a credential the verifier rejected. Per transport —
 *
 * - **vcalm**: `no-vcapi` (the interaction advertised no exchange endpoint),
 *   `no-didauth` (no DIDAuthentication challenge came back), `no-tls` (the
 *   interaction host did not negotiate TLS 1.2).
 * - **oid4vci**: `no-metadata` (issuer metadata named no credential endpoint),
 *   `jwt-only` (only a JWT key-proof type is advertised), `no-bundle-alg`
 *   (`di_vp` is offered but signs with nothing in the rdfc bundle),
 *   `token-refused` (the pre-authorized code was not redeemed).
 *
 * Any sentinel that blocks the flow also stops delivery, so a fake run reads the
 * way a real one does.
 */
function fakeReceive(
	transport: 'direct' | 'vcalm' | 'oid4vci',
	input: string
): ReceiveFromIssuerResult {
	const has = (sentinel: string) => input.includes(sentinel);
	const blocked =
		has('miss') ||
		(transport === 'vcalm' && (has('no-vcapi') || has('no-didauth'))) ||
		(transport === 'oid4vci' && (has('no-metadata') || has('token-refused')));
	const delivered = !blocked;
	const verified = delivered && !has('unverified');
	const common = {
		verified,
		...(verified ? {} : { verifyErrors: ['The credential did not verify.'] })
	};
	const holder = delivered
		? { holderDid: 'did:key:zFakeHolder', subjectId: 'did:key:zFakeHolder' }
		: {};

	if (transport === 'vcalm') {
		const vcapiAdvertised = !has('no-vcapi');
		const flow: ReceiveFromIssuerResult['flow'] = {
			transport: 'vcalm',
			...common,
			interactionFetched: true,
			participationOk: true,
			vcapiAdvertised,
			didAuthRequested: vcapiAdvertised && !has('no-didauth'),
			interactionTls: has('no-tls')
				? { atLeastTls12: false, error: 'The interaction endpoint negotiated TLSv1.1.' }
				: { atLeastTls12: true, protocol: 'TLSv1.3' },
			...holder
		};
		return receiveResult(flow, delivered, input, fakeTrace('vcalm', delivered));
	}

	if (transport === 'oid4vci') {
		const metadataReachable = !has('no-metadata');
		const diVpOffered = metadataReachable && !has('jwt-only');
		const diVpSigningAlgs = diVpOffered
			? has('no-bundle-alg')
				? ['bbs-2023']
				: ['eddsa-rdfc-2022']
			: [];
		const flow: ReceiveFromIssuerResult['flow'] = {
			transport: 'oid4vci',
			...common,
			metadataReachable,
			diVpOffered,
			proofTypesOffered: metadataReachable ? (diVpOffered ? ['di_vp'] : ['jwt']) : [],
			diVpSigningAlgs,
			diVpSigningAlgInBundle: diVpSigningAlgs.includes('eddsa-rdfc-2022'),
			preAuthCodeRedeemed: metadataReachable && !has('token-refused'),
			credentialDelivered: delivered,
			...(delivered ? { credentialStatus: 200 } : {}),
			issuerTls: has('no-tls')
				? { atLeastTls12: false, error: 'The credential issuer negotiated TLSv1.1.' }
				: { atLeastTls12: true, protocol: 'TLSv1.3' },
			...holder
		};
		return receiveResult(flow, delivered, input, fakeTrace('oid4vci', delivered));
	}

	// The `direct` intake has no wire, so it gets no trace — the same as the real leaf.
	return receiveResult({ transport: 'direct', ...common }, delivered, input);
}

/** Assemble the fake's result: a credential when it delivered, a reason when it didn't. */
function receiveResult(
	flow: ReceiveFromIssuerResult['flow'],
	delivered: boolean,
	input: string,
	trace?: ReceiveFromIssuerResult['trace']
): ReceiveFromIssuerResult {
	return {
		flow,
		...(delivered ? { credential: pastedCredential(input) ?? fakeReceivedCredential() } : {}),
		delivered,
		...(trace ? { trace } : {}),
		...(delivered ? {} : { error: { message: 'The issuer delivered no credential.' } })
	};
}

/**
 * A plausible wire trace for the fake's two live transports, so the Details
 * panel has something to render without a real issuer.
 *
 * It is a **shape** fixture, not a recording: the stages, their order, and the
 * fact that a failed run's last stage is where it stopped are what the panel is
 * exercised against. A miss ends on a failing final stage, which is the case the
 * panel exists for.
 */
function fakeTrace(
	transport: 'vcalm' | 'oid4vci',
	delivered: boolean
): ReceiveFromIssuerResult['trace'] {
	const host = 'https://issuer.example';
	if (transport === 'vcalm') {
		return {
			stages: [
				{
					name: 'interaction',
					label: 'Interaction URL',
					method: 'GET',
					url: `${host}/exchanges/fake/interaction`,
					status: 200,
					ok: true,
					body: { vcapi: { url: `${host}/exchanges/fake` } }
				},
				{
					name: 'didauth',
					label: 'DIDAuth request',
					status: 200,
					ok: true,
					body: { query: [{ type: 'DIDAuthentication' }], challenge: 'fake-challenge' }
				},
				{
					name: 'delivery',
					label: 'Credential delivery',
					method: 'POST',
					url: `${host}/exchanges/fake`,
					status: delivered ? 200 : 500,
					ok: delivered,
					...(delivered ? {} : { error: 'The exchange responded 500.' })
				}
			]
		};
	}
	return {
		stages: [
			{
				name: 'offer',
				label: 'Credential offer',
				method: 'GET',
				url: `${host}/openid/credential-offer`,
				status: 200,
				ok: true,
				body: { credential_issuer: host }
			},
			{
				name: 'issuer-metadata',
				label: 'Credential issuer metadata',
				method: 'GET',
				url: `${host}/.well-known/openid-credential-issuer`,
				status: 200,
				ok: true,
				body: { credential_endpoint: `${host}/openid/credential` }
			},
			{
				name: 'token',
				label: 'Token request',
				method: 'POST',
				url: `${host}/openid/token`,
				status: 200,
				ok: true,
				body: { token_type: 'Bearer', expires_in: 300 }
			},
			{
				name: 'credential',
				label: 'Credential request',
				method: 'POST',
				url: `${host}/openid/credential`,
				status: delivered ? 200 : 500,
				ok: delivered,
				...(delivered ? {} : { error: 'The credential request responded 500.' })
			}
		]
	};
}

/** A JSON object pasted into the input, so a test can drive the payload checks with any shape. */
function pastedCredential(input: string): Record<string, unknown> | undefined {
	const text = input.trim();
	if (!text.startsWith('{')) return undefined;
	try {
		const parsed: unknown = JSON.parse(text);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

/** Deterministic fake VCALM present; sentinels `no-vcapi` / `miss` in the URL drive the branches. */
function fakeVcalmPresent(interactionUrl: string): PresentToVcalmResult {
	const advertised = !interactionUrl.includes('no-vcapi');
	const submitted = advertised && !interactionUrl.includes('miss');
	return {
		request: {
			transport: 'vcalm',
			vcapiAdvertised: advertised,
			vprReceived: advertised,
			vprMatched: advertised,
			didAuth: advertised,
			requestTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
			responseTls: advertised
				? { atLeastTls12: true, protocol: 'TLSv1.3' }
				: { atLeastTls12: false, error: 'The exchange advertised no endpoint to probe.' }
		},
		present: submitted
			? { submitted: true, transportStatus: 200 }
			: {
					submitted: false,
					...(advertised
						? {
								transportStatus: 400,
								error: { message: 'The exchange rejected the presentation.' }
							}
						: { error: { message: 'The interaction URL advertised no exchange endpoint.' } })
				},
		trace: fakePresentTrace('vcalm', { reached: advertised, submitted })
	};
}

/**
 * Deterministic fake OID4VP present; sentinels in the pasted input drive the
 * branches: `unresolved` fails the request (scored, present skipped), `jwt-only`
 * pins a JWT-only format, `inline` marks an inline request, `miss` an
 * un-submitted delivery.
 */
function fakeOid4Present(input: string): PresentToOid4Result {
	if (input.includes('unresolved')) {
		return {
			request: {
				transport: 'oid4vp',
				requestForm: 'by-reference',
				requestResolved: false,
				matchable: false,
				matchReason: 'The request did not resolve.',
				diVpFormat: 'unpinned',
				requestTls: { atLeastTls12: false, error: 'not probed' },
				responseTls: { atLeastTls12: false, error: 'not probed' }
			},
			present: { submitted: false, error: { message: 'The request did not resolve.' } },
			trace: fakePresentTrace('oid4vp', { reached: false, submitted: false })
		};
	}
	const inline = input.includes('inline');
	const submitted = !input.includes('miss');
	return {
		request: {
			transport: 'oid4vp',
			requestForm: inline ? 'inline' : 'by-reference',
			requestResolved: true,
			matchable: true,
			diVpFormat: input.includes('jwt-only') ? 'jwt-only' : 'di',
			requestTls: inline
				? { atLeastTls12: true, protocol: 'inline (no request endpoint)' }
				: { atLeastTls12: true, protocol: 'TLSv1.3' },
			responseTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
		},
		present: submitted
			? { submitted: true, transportStatus: 200 }
			: {
					submitted: false,
					transportStatus: 400,
					error: { message: 'The verifier rejected the presentation.' }
				},
		trace: fakePresentTrace('oid4vp', { reached: true, submitted })
	};
}

/**
 * A plausible present trace for the fake, so the Details panel has something to
 * render without a real verifier.
 *
 * A shape fixture, not a recording — what it pins is the stage order and the
 * contract that the last stage present is where the flow stopped. `reached`
 * false means the request leg itself failed, so no submission stage exists.
 */
function fakePresentTrace(
	transport: 'vcalm' | 'oid4vp',
	{ reached, submitted }: { reached: boolean; submitted: boolean }
): PresentToVcalmResult['trace'] {
	const host = 'https://verifier.example';
	if (transport === 'oid4vp') {
		const request = {
			name: 'request',
			label: 'Authorization request',
			ok: reached,
			...(reached
				? { body: { presentation_definition: { id: 'fake-pd' }, response_uri: `${host}/submit` } }
				: { error: 'The request did not resolve.' })
		};
		if (!reached) return { stages: [request] };
		return {
			stages: [
				request,
				{
					name: 'submission',
					label: 'Presentation submission',
					method: 'POST',
					url: `${host}/submit`,
					status: submitted ? 200 : 400,
					ok: submitted,
					...(submitted ? {} : { error: 'The verifier rejected the presentation.' })
				}
			]
		};
	}

	const interaction = {
		name: 'interaction',
		label: 'Interaction URL',
		method: 'GET' as const,
		url: `${host}/interactions/fake`,
		status: 200,
		ok: true,
		...(reached
			? { body: { vcapi: { url: `${host}/exchanges/fake` } } }
			: { body: {}, error: 'The interaction URL advertised no exchange endpoint.' })
	};
	if (!reached) return { stages: [interaction] };
	return {
		stages: [
			interaction,
			{
				name: 'request',
				label: 'Presentation request',
				ok: true,
				body: { challenge: 'fake-challenge', queries: [{ type: 'DIDAuthentication' }] }
			},
			{
				name: 'submission',
				label: 'Presentation submission',
				method: 'POST',
				url: `${host}/exchanges/fake`,
				status: submitted ? 200 : 400,
				ok: submitted,
				...(submitted ? {} : { error: 'The exchange rejected the presentation.' })
			}
		]
	};
}
