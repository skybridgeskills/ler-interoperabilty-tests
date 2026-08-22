import type { RequirementOutcome, StepEvidence } from '$lib/interop/scenario-run/index.js';
import { Requirement } from '$lib/interop/scenarios/index.js';

/**
 * Requirements and outcomes the scenario-step stories render.
 *
 * Kept beside the components rather than inlined in each story so every state
 * is described once, and so the story files stay a catalogue of *states* rather
 * than a wall of fixture data.
 */

export const exchangeComplete = Requirement({
	id: 'exchange-complete',
	statement: 'The exchange completed.',
	level: 'MUST',
	check: { kind: 'automatic', checkId: 'exchange-reached-complete' }
});

export const stored = Requirement({
	id: 'stored',
	statement: 'The credential appears in your wallet’s list.',
	level: 'MUST',
	check: { kind: 'attested', answer: { kind: 'affirm' } }
});

export const handled = Requirement({
	id: 'handled',
	statement: 'What did your wallet do with this credential?',
	level: 'MUST',
	check: {
		kind: 'attested',
		answer: {
			kind: 'choose',
			options: [
				{ value: 'accepted', label: 'Accepted it' },
				{ value: 'refused', label: 'Refused it' },
				{ value: 'warned', label: 'Accepted it, with a visible warning' }
			],
			correct: 'refused'
		}
	}
});

export const displayed = Requirement({
	id: 'displayed',
	statement: 'Your wallet said why it refused the credential.',
	level: 'SHOULD',
	check: { kind: 'attested', answer: { kind: 'affirm' } }
});

export const autoPass: RequirementOutcome = {
	requirementId: 'exchange-complete',
	level: 'MUST',
	status: 'pass',
	source: 'automated'
};

export const autoFail: RequirementOutcome = {
	requirementId: 'exchange-complete',
	level: 'MUST',
	status: 'fail',
	source: 'automated',
	detail: 'The exchange never reached `complete`.'
};

export const answeredCorrectly: RequirementOutcome = {
	requirementId: 'handled',
	level: 'MUST',
	status: 'pass',
	source: 'attested',
	answer: { kind: 'choose', value: 'refused' },
	expected: { kind: 'choose', value: 'refused' }
};

export const answeredWrongly: RequirementOutcome = {
	requirementId: 'handled',
	level: 'MUST',
	status: 'fail',
	source: 'attested',
	answer: { kind: 'choose', value: 'accepted' },
	expected: { kind: 'choose', value: 'refused' }
};

export const couldNotTell: RequirementOutcome = {
	requirementId: 'handled',
	level: 'MUST',
	status: 'fail',
	source: 'attested',
	answer: { kind: 'cant-tell' },
	expected: { kind: 'choose', value: 'refused' },
	detail: 'You could not tell — which is itself the finding.'
};

export const affirmAnsweredWrongly: RequirementOutcome = {
	requirementId: 'stored',
	level: 'MUST',
	status: 'fail',
	source: 'attested',
	answer: { kind: 'affirm', value: false },
	expected: { kind: 'affirm', value: true }
};

export const SETUP =
	'We will offer your wallet an Open Badges credential whose validity period ended in 2024. Everything else about it is well-formed.';

/**
 * Evidence fixtures for the {@link import('./StepDetails.svelte')} panel.
 *
 * Shapes rather than recordings: what they pin is that a flow which stopped
 * early ends on a failing stage, that a truncated body announces itself, and
 * that a transport with no wire still has something worth showing.
 */

/** An OID4VCI intake that reached the credential endpoint and got a 500 — the case the panel exists for. */
export const oid4MissEvidence: StepEvidence = {
	stepId: 'issue',
	issuerFlow: {
		transport: 'oid4vci',
		verified: false,
		metadataReachable: true,
		diVpOffered: true,
		proofTypesOffered: ['di_vp'],
		diVpSigningAlgs: ['eddsa-rdfc-2022'],
		diVpSigningAlgInBundle: true,
		preAuthCodeRedeemed: true,
		credentialDelivered: false,
		credentialStatus: 500,
		issuerTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
	},
	transport: { delivered: false, error: { message: 'Your issuer delivered no credential.' } },
	trace: {
		stages: [
			{
				name: 'offer',
				label: 'Credential offer',
				method: 'GET',
				url: 'https://lit-exchanges.example/workflows/claim/exchanges/2fe9/openid/credential-offer',
				status: 200,
				ok: true,
				body: { credential_issuer: 'https://lit-exchanges.example', grants: {} }
			},
			{
				name: 'issuer-metadata',
				label: 'Credential issuer metadata',
				method: 'GET',
				url: 'https://lit-exchanges.example/.well-known/openid-credential-issuer',
				status: 200,
				ok: true,
				body: { credential_endpoint: 'https://lit-exchanges.example/openid/credential' }
			},
			{
				name: 'token',
				label: 'Token request',
				method: 'POST',
				url: 'https://lit-exchanges.example/openid/token',
				status: 200,
				ok: true,
				body: { token_type: 'Bearer', expires_in: 300 }
			},
			{
				name: 'credential',
				label: 'Credential request',
				method: 'POST',
				url: 'https://lit-exchanges.example/workflows/claim/exchanges/2fe9/openid/credential',
				status: 500,
				ok: false,
				body: { error: 'server_error', error_description: 'Cannot read property id of undefined' },
				error: 'credential request responded 500.'
			}
		]
	}
};

/** A stage whose body exceeded the display cap, so the panel must say how much is missing. */
export const truncatedEvidence: StepEvidence = {
	stepId: 'issue',
	trace: {
		stages: [
			{
				name: 'credential',
				label: 'Credential request',
				method: 'POST',
				url: 'https://issuer.example/openid/credential',
				status: 200,
				ok: true,
				// A real truncation is exactly the display cap long, so the story shows
				// the message an operator will actually read ("the first 8 KB of 412 KB")
				// rather than a stand-in that understates it.
				body: `{"credential":"${'e'.repeat(8 * 1024 - 16)}`,
				truncated: { originalBytes: 421_888 }
			}
		]
	}
};

/** The `direct` intake: no wire at all, so the summary and the credential are the evidence. */
export const directEvidence: StepEvidence = {
	stepId: 'deliver',
	issuerFlow: { transport: 'direct', verified: true },
	transport: { delivered: true },
	artifact: {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: { id: 'did:web:issuer.example' },
		credentialSubject: {
			type: ['AchievementSubject'],
			identifier: [
				{
					type: 'IdentityObject',
					identityType: 'emailAddress',
					hashed: false,
					identityHash: 'learner@example.edu'
				}
			]
		}
	}
};
