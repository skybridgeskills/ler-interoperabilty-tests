import { describe, expect, it } from 'vitest';

import { percentFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/percent.js';
import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';
import { rubricCriterionLevelFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/rubric-criterion-level.js';

import { openSkillAlignmentIssuerChecks } from './open-skill-alignment-issuer.js';
import type { CheckCtx } from './types.js';

const ctxOn = (credential: unknown): CheckCtx => ({
	credential,
	verifierResult: { verified: true, log: [{ id: 'valid_signature', valid: true }] },
	includeAdditive: true
});

const ctxOff = (credential: unknown): CheckCtx => ({
	...ctxOn(credential),
	includeAdditive: false
});

describe('open-skill-alignment — happy-path fixtures', () => {
	const fixtures = [
		{ name: 'RawScore', credential: rawScoreFixture },
		{ name: 'Percent', credential: percentFixture },
		{ name: 'RubricCriterionLevel', credential: rubricCriterionLevelFixture }
	];

	for (const { name, credential } of fixtures) {
		it(`${name} passes core additive-profile checks`, () => {
			const ctx = ctxOn(credential);
			const idsThatMustPass = [
				'open-skill-alignment.result-description.present',
				'open-skill-alignment.result-description.recognized-result-type',
				'open-skill-alignment.result.present',
				'open-skill-alignment.result.links-description',
				'open-skill-alignment.result-description.ctdl-alignment'
			];
			for (const id of idsThatMustPass) {
				const out = openSkillAlignmentIssuerChecks[id]?.(ctx);
				expect(out?.status, `${id} on ${name}`).toBe('pass');
			}
		});
	}

	it('numeric-value-in-range passes for RawScore', () => {
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result.numeric-value-in-range'
		]!(ctxOn(rawScoreFixture));
		expect(out.status).toBe('pass');
	});

	it('numeric-value-in-range passes for Percent', () => {
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result.numeric-value-in-range'
		]!(ctxOn(percentFixture));
		expect(out.status).toBe('pass');
	});

	it('numeric-value-in-range returns n/a for RubricCriterionLevel', () => {
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result.numeric-value-in-range'
		]!(ctxOn(rubricCriterionLevelFixture));
		expect(out.status).toBe('n/a');
	});

	it('achieved-level-matches passes for the rubric fixture', () => {
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result.achieved-level-matches'
		]!(ctxOn(rubricCriterionLevelFixture));
		expect(out.status).toBe('pass');
	});
});

describe('open-skill-alignment — additive toggle off', () => {
	it('returns n/a on every additive check when includeAdditive=false', () => {
		const ctx = ctxOff(rawScoreFixture);
		for (const fn of Object.values(openSkillAlignmentIssuerChecks)) {
			expect(fn(ctx).status).toBe('n/a');
		}
	});
});

describe('open-skill-alignment — rejection cases', () => {
	it('fails when resultDescription[] is empty', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.achievement.resultDescription = [];
		const out = openSkillAlignmentIssuerChecks['open-skill-alignment.result-description.present']!(
			ctxOn(broken)
		);
		expect(out.status).toBe('fail');
	});

	it('fails when resultType is unrecognized', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.achievement.resultDescription[0].resultType = 'LetterGrade';
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result-description.recognized-result-type'
		]!(ctxOn(broken));
		expect(out.status).toBe('fail');
	});

	it('fails when result.value is outside [valueMin, valueMax]', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.result[0].value = '120';
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result.numeric-value-in-range'
		]!(ctxOn(broken));
		expect(out.status).toBe('fail');
	});

	it('fails when result references an unknown resultDescription id', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.result[0].resultDescription = 'urn:uuid:nope';
		const out = openSkillAlignmentIssuerChecks['open-skill-alignment.result.links-description']!(
			ctxOn(broken)
		);
		expect(out.status).toBe('fail');
	});

	it('fails when achievedLevel does not match any declared level', () => {
		const broken = JSON.parse(JSON.stringify(rubricCriterionLevelFixture));
		broken.credentialSubject.result[0].achievedLevel = 'urn:uuid:not-a-level';
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result.achieved-level-matches'
		]!(ctxOn(broken));
		expect(out.status).toBe('fail');
	});

	it('warns when an alignment targetUrl is off-allowlist', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.achievement.resultDescription[0].alignment[0].targetUrl =
			'https://other-registry.example.org/skill/x';
		const out = openSkillAlignmentIssuerChecks[
			'open-skill-alignment.result-description.ctdl-alignment'
		]!(ctxOn(broken));
		expect(out.status).toBe('warn');
	});
});
