import { Scenario } from './scenario-schema.js';

/**
 * The OID4VP verifier **delivery** scenario — the happy-path connection probe.
 *
 * One step: present a **valid** credential to the operator's verifier over
 * OID4VP (`direct_post`), from the authorization request they paste, and measure
 * the wire. "Can a credential get into your verifier over OID4VP, and does the
 * request it publishes conform?" The floor comes from **inspecting the pasted
 * request** — unlike VCALM, whose floor rides on a VC-API fetch — and the
 * delivery row from submitting the valid control; the present leaf does both in
 * one present.
 *
 * Six requirements: the five request-floor facts (the request resolves; its
 * presentation definition asks for an OpenBadgeCredential; it accepts a Data
 * Integrity VP rather than JWT-only; TLS on the request and response endpoints)
 * plus the delivery row (the credential was submitted). All **automatic**.
 *
 * Two resolved-policy points distinguish it from VCALM's all-MUST floor
 * (M10b notes):
 * - **`request-di-vp-format` is a MUST that fails only on a JWT-only request** —
 *   a request that declares nothing, or a mixed non-JWT set, passes (a DI-proof
 *   OB3 can still be presented). Only exclusively-JWT is a genuine interop-breaker.
 * - **`request-tls` is a SHOULD** — the credential's real transport is the
 *   `response_uri` (`response-tls`, MUST); the request object's transport is
 *   best-practice, and an **inline** request has no endpoint to probe (it passes).
 *
 * Presenting a **valid** control is what lets the delivery row be scored without
 * leaking any concealed verdict — an honest "does your endpoint work" probe.
 * Whether the verifier *accepts* good from bad is the acceptance scenario's
 * separate measurement.
 */
export const oid4VerifierDelivery = Scenario({
	slug: 'oid4-verifier-delivery',
	name: 'Deliver a credential to your verifier over OID4VP',
	blurb:
		'Present a well-formed credential to your verifier over OID4VP, using the authorization request it publishes. We inspect that request and check the credential reaches your response endpoint — the wire, not the verdict.',
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	memberships: [{ profile: 'oid4', level: 'required' }],
	steps: [
		{
			id: 'deliver',
			title: 'Deliver a credential to your verifier over OID4VP',
			summary:
				'We will present a well-formed Open Badges credential to your verifier over OID4VP (direct_post), using the authorization request you paste.',
			action: { kind: 'present-to-verifier', credential: 'minimal-ob3', transport: 'oid4vp' },
			requirements: [
				{
					id: 'request-endpoint',
					statement: 'Your verifier produced a resolvable OID4VP authorization request.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-request-endpoint' }
				},
				{
					id: 'request-matchable',
					statement:
						'Your request asked for an OpenBadgeCredential via its presentation definition.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-request-matchable' }
				},
				{
					id: 'request-di-vp-format',
					statement:
						'Your request accepts a Data Integrity verifiable presentation (not JWT-only).',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-request-di-vp-format' }
				},
				{
					id: 'request-tls',
					statement: 'Your request endpoint used TLS 1.2 or above.',
					level: 'SHOULD',
					check: { kind: 'automatic', checkId: 'oid4-request-tls' }
				},
				{
					id: 'response-tls',
					statement: 'Your response endpoint used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-response-tls' }
				},
				{
					id: 'response-endpoint',
					statement: 'The credential was submitted to your response endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'oid4-response-endpoint' }
				}
			]
		}
	]
});
