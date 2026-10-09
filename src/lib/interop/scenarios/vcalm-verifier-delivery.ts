import { cite } from './citations.js';
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
	name: 'Deliver a credential to the verifier over VCALM',
	blurb:
		'Present a well-formed credential to the verifier over a VC-API exchange. We check the exchange it offers and that the credential reaches it — the wire, not the verdict.',
	framing: {
		builder:
			'You’re testing whether a credential can get into your own verifier over VCALM: have a build that can open a VC-API exchange whose request asks for an Open Badges credential by example and for DID authentication. We present one valid credential and check the exchange on the wire, so a failure points at what your exchange offered or asked for, not at your verifier’s judgement. Whether it turns away bad credentials is measured separately, in the acceptance scenario.',
		evaluator:
			'You’re checking whether a vendor’s verifier can receive a credential over VCALM and asks for it the standard way. Get an interaction URL from a live exchange on the vendor’s verifier; we present one valid credential and read everything off the wire, so there are no questions to answer. A pass says the connection works, not that the verifier judges well, so pair it with the acceptance scenario before drawing conclusions.'
	},
	standards: [cite.vcalmInteractionUrl, cite.vcalmQueryByExample, cite.vcalmDidAuthentication],
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	memberships: [{ profile: 'vcalm', level: 'required' }],
	steps: [
		{
			id: 'deliver',
			title: 'Deliver a credential to the verifier over VCALM',
			summary:
				'We will present a well-formed Open Badges credential to the verifier over the VC-API exchange it offers.',
			action: { kind: 'present-to-verifier', credential: 'minimal-ob3', transport: 'vcalm' },
			requirements: [
				{
					id: 'interaction-endpoint',
					statement: 'The verifier advertised a VC-API exchange endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-interaction-endpoint' }
				},
				{
					id: 'vpr-query',
					statement: 'The verifier asked for an OpenBadgeCredential via a QueryByExample query.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-vpr-query' }
				},
				{
					id: 'vpr-didauth',
					statement: 'The verifier’s request included a DID-authentication query.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-vpr-didauth' }
				},
				{
					id: 'request-tls',
					statement: 'The verifier’s interaction endpoint used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-request-tls' }
				},
				{
					id: 'response-tls',
					statement: 'The verifier’s exchange endpoint used TLS 1.2 or above.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-response-tls' }
				},
				{
					id: 'response-endpoint',
					statement: 'The credential was submitted to the verifier’s exchange endpoint.',
					level: 'MUST',
					check: { kind: 'automatic', checkId: 'vcalm-response-endpoint' }
				}
			]
		}
	]
});
