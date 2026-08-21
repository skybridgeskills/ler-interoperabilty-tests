import { Scenario } from './scenario-schema.js';

/**
 * The VCALM verifier **delivery** scenario — the happy-path connection probe.
 *
 * One step: present a **valid** credential to the operator's verifier over a
 * fresh single-use VC-API exchange, and measure the wire. "Can a credential get
 * into your verifier over VCALM, and does the exchange it offers conform?" The
 * six requirements are all **automatic** — the floor (does the interaction URL
 * advertise a `vcapi` endpoint; does the VPR ask for an OpenBadgeCredential via
 * QueryByExample; a DIDAuthentication query; TLS ≥ 1.2 on both hosts) plus the
 * delivery row (the credential was submitted).
 *
 * **This is the catalog's first pure-automatic scenario** — no attested
 * question, by design (owner-confirmed). It measures conformance the suite can
 * see on the wire; whether the verifier *accepts* good from bad is a separate
 * measurement, the acceptance scenario. Presenting a **valid** control is what
 * lets the delivery row be scored without leaking any concealed verdict — an
 * honest "does your endpoint work" probe.
 *
 * The floor/delivery checks are ported 1:1 from the retired verifier-runner
 * `vcalm` engine (`vpr-checks.ts` / `score-delivered-run.ts`), now pure
 * functions over the `present-to-verifier` step's request/present evidence.
 */
export const vcalmVerifierDelivery = Scenario({
	slug: 'vcalm-verifier-delivery',
	name: 'Deliver a credential to your verifier over VCALM',
	blurb:
		'Present a well-formed credential to your verifier over a VC-API exchange. We check the exchange it offers and that the credential reaches it — the wire, not the verdict.',
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'deliver',
			title: 'Deliver a credential to your verifier over VCALM',
			summary:
				'We will present a well-formed Open Badges credential to your verifier over the VC-API exchange it offers.',
			action: { kind: 'present-to-verifier', credential: 'minimal-ob3', transport: 'vcalm' },
			requirements: [
				{
					id: 'interaction-endpoint',
					statement: 'Your verifier advertised a VC-API exchange endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-interaction-endpoint' }
				},
				{
					id: 'vpr-query',
					statement: 'Your verifier asked for an OpenBadgeCredential via a QueryByExample query.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-vpr-query' }
				},
				{
					id: 'vpr-didauth',
					statement: 'Your verifier’s request included a DID-authentication query.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-vpr-didauth' }
				},
				{
					id: 'request-tls',
					statement: 'Your verifier’s interaction endpoint used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-request-tls' }
				},
				{
					id: 'response-tls',
					statement: 'Your verifier’s exchange endpoint used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-response-tls' }
				},
				{
					id: 'response-endpoint',
					statement: 'The credential was submitted to your verifier’s exchange endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-response-endpoint' }
				}
			]
		}
	]
});
