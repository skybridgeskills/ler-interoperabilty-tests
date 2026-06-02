import { describe, expect, it } from 'vitest';

import { percentFixture } from './fixtures/percent.js';
import { rawScoreFixture } from './fixtures/raw-score.js';
import { rubricCriterionLevelFixture } from './fixtures/rubric-criterion-level.js';
import { OpenSkillAlignmentFragment } from './payload-fragment-schema.js';

function fragmentOf(credential: Record<string, unknown>) {
	const subject = credential.credentialSubject as {
		achievement: { resultDescription: unknown };
		result: unknown;
	};
	return {
		resultDescription: subject.achievement.resultDescription,
		result: subject.result
	};
}

describe('OpenSkillAlignmentFragment — happy-path fixtures', () => {
	it('accepts the RawScore fixture fragment', () => {
		expect(() =>
			OpenSkillAlignmentFragment.schema.parse(fragmentOf(rawScoreFixture))
		).not.toThrow();
	});

	it('accepts the Percent fixture fragment', () => {
		expect(() => OpenSkillAlignmentFragment.schema.parse(fragmentOf(percentFixture))).not.toThrow();
	});

	it('accepts the RubricCriterionLevel fixture fragment', () => {
		expect(() =>
			OpenSkillAlignmentFragment.schema.parse(fragmentOf(rubricCriterionLevelFixture))
		).not.toThrow();
	});
});

describe('OpenSkillAlignmentFragment — rejection cases', () => {
	it('rejects an empty resultDescription array', () => {
		expect(() =>
			OpenSkillAlignmentFragment({
				resultDescription: [],
				result: [
					{
						type: ['Result'],
						resultDescription: 'urn:uuid:nope',
						value: '50'
					}
				]
			})
		).toThrow();
	});

	it('rejects an unrecognized resultType', () => {
		expect(() =>
			OpenSkillAlignmentFragment.schema.parse({
				resultDescription: [
					{
						id: 'urn:uuid:rd-bad',
						type: ['ResultDescription'],
						name: 'Bad',
						resultType: 'LetterGrade',
						allowedValue: ['A', 'B', 'C']
					}
				],
				result: [{ type: ['Result'], resultDescription: 'urn:uuid:rd-bad', value: 'A' }]
			})
		).toThrow();
	});

	it('rejects a non-URL targetUrl on an alignment', () => {
		expect(() =>
			OpenSkillAlignmentFragment({
				resultDescription: [
					{
						id: 'urn:uuid:rd-no-url',
						type: ['ResultDescription'],
						name: 'No URL',
						resultType: 'RawScore',
						valueMin: '0',
						valueMax: '100',
						alignment: [
							{
								type: ['Alignment'],
								targetType: 'CFItem',
								targetName: 'No URL Alignment',
								targetUrl: 'not-a-url'
							}
						]
					}
				],
				result: [{ type: ['Result'], resultDescription: 'urn:uuid:rd-no-url', value: '70' }]
			})
		).toThrow();
	});
});
