import type { RequirementOutcome } from '$lib/interop/scenario-run/index.js';
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
