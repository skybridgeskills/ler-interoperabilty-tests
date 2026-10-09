import type { AttestedAnswer, Requirement } from '$lib/interop/scenarios/index.js';

import { checkById } from './automatic-checks.js';
import type { RunEvidence } from './evidence.js';
import type { AttestedAnswerValue, RequirementOutcome } from './requirement-outcome.js';

/**
 * Score an operator's answer against the concealed right answer.
 *
 * | Answer | Outcome |
 * | --- | --- |
 * | matches the expected answer | `pass` |
 * | does not match | `fail` |
 * | `cant-tell` | **`fail`** |
 *
 * **`cant-tell` fails, and that is the point.** "My wallet gave me nothing to
 * judge by" is precisely the legibility failure under test; bucketing it as
 * incomplete would park the commonest real failure mode in limbo and quietly
 * punish the honest answer. The UI says so plainly — *that's a finding, not a
 * mistake* — but here it is simply a failure.
 *
 * Throws if the answer's shape does not match the requirement's question. That
 * is a caller bug, not an operator outcome.
 */
export function scoreAttestedAnswer(
	requirement: Requirement,
	answer: AttestedAnswerValue
): RequirementOutcome {
	if (requirement.check.kind !== 'attested') {
		throw new Error(
			`Requirement "${requirement.id}" is automatic; it cannot take an operator answer.`
		);
	}
	const expected = expectedAnswerFor(requirement.check.answer);

	if (answer.kind === 'cant-tell') {
		return {
			requirementId: requirement.id,
			level: requirement.level,
			status: 'fail',
			source: 'attested',
			answer,
			expected,
			detail: 'You could not tell — which is itself the finding.'
		};
	}

	if (answer.kind !== expected.kind) {
		throw new Error(
			`Requirement "${requirement.id}" asks a "${expected.kind}" question but was answered "${answer.kind}".`
		);
	}

	const matched = answer.value === (expected as { value: unknown }).value;
	return {
		requirementId: requirement.id,
		level: requirement.level,
		status: matched ? 'pass' : 'fail',
		source: 'attested',
		answer,
		expected
	};
}

/**
 * The concealed right answer a question is scored against.
 *
 * `affirm` is authored so **`true` is always expected** — an author wanting the
 * negative rewrites the statement — which is why the definition carries no
 * `expected` field to read.
 */
export function expectedAnswerFor(answer: AttestedAnswer): AttestedAnswerValue {
	return answer.kind === 'affirm'
		? { kind: 'affirm', value: true }
		: { kind: 'choose', value: answer.correct };
}

/**
 * Resolve an automatic requirement against the run's evidence.
 *
 * A requirement naming a check that is not registered **fails** rather than
 * throwing: the catalog is authored data, and a live run should surface the
 * authoring error instead of collapsing.
 */
export function resolveAutomaticRequirement(
	requirement: Requirement,
	stepId: string,
	evidence: RunEvidence
): RequirementOutcome {
	if (requirement.check.kind !== 'automatic') {
		throw new Error(`Requirement "${requirement.id}" is attested; it has no check to run.`);
	}

	const check = checkById(requirement.check.checkId);
	if (!check) {
		return {
			requirementId: requirement.id,
			level: requirement.level,
			status: 'fail',
			source: 'automated',
			detail: `No automatic check is registered as "${requirement.check.checkId}".`
		};
	}

	const result = check.run({ stepId, evidence });
	return {
		requirementId: requirement.id,
		level: requirement.level,
		status: result.met ? 'pass' : 'fail',
		source: 'automated',
		...(result.detail ? { detail: result.detail } : {})
	};
}
