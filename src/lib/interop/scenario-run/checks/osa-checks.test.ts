import { describe, expect, it } from 'vitest';

import { percentFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/percent.js';
import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';
import { rubricCriterionLevelFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/rubric-criterion-level.js';

import { checkById } from '../automatic-checks.js';
import type { RunEvidence } from '../evidence.js';

/**
 * The nine Open Skill Alignment checks, ported from
 * `issuer-runner/checks/open-skill-alignment-issuer.ts`. Every case that file's
 * test protected is carried over — bar the `includeAdditive` toggle cases, which
 * went with the flag — plus the six `n/a` branches M11 resolved.
 */

function evidence(artifact: unknown): RunEvidence {
	return { steps: { s1: { stepId: 's1', artifact } } };
}

function run(id: string, artifact: unknown) {
	const check = checkById(id);
	expect(check, `check "${id}" is registered`).toBeDefined();
	return check!.run({ stepId: 's1', evidence: evidence(artifact) });
}

/** A deep copy of a fixture, so a case can break one field without leaking. */
function copy<T>(fixture: T): T {
	return JSON.parse(JSON.stringify(fixture)) as T;
}

const ALL = [
	'osa-result-description-present',
	'osa-recognized-result-type',
	'osa-percent-value-range',
	'osa-rubric-levels-present',
	'osa-ctdl-alignment',
	'osa-result-present',
	'osa-result-links-description',
	'osa-numeric-value-in-range',
	'osa-achieved-level-matches'
];

describe('the OSA checks against the happy-path fixtures', () => {
	const fixtures = [
		{ name: 'RawScore', credential: rawScoreFixture },
		{ name: 'Percent', credential: percentFixture },
		{ name: 'RubricCriterionLevel', credential: rubricCriterionLevelFixture }
	];

	for (const { name, credential } of fixtures) {
		it(`${name} passes all nine`, () => {
			for (const id of ALL) expect(run(id, credential).met, `${name} / ${id}`).toBe(true);
		});
	}

	it('every check fails legibly with no credential at all, rather than throwing', () => {
		for (const artifact of [undefined, null, 'not json', 42, []]) {
			for (const id of ALL) {
				const result = run(id, artifact);
				expect(result.met, `${id} / ${String(artifact)}`).toBe(false);
				expect(result.detail, id).toBeTruthy();
			}
		}
	});

	it('there is no `alignment-optional` check — the MAY row is dropped, not carried', () => {
		expect(checkById('osa-alignment-optional')).toBeUndefined();
		expect(checkById('osa-result-alignment-optional')).toBeUndefined();
	});
});

describe('the resolved vacuous-pass branches (M11)', () => {
	it('percent-value-range passes when there are no Percent rows', () => {
		const result = run('osa-percent-value-range', rubricCriterionLevelFixture);
		expect(result.met).toBe(true);
		expect(result.detail).toMatch(/nothing here to violate/);
	});

	it('rubric-levels-present passes when there are no rubric rows', () => {
		expect(run('osa-rubric-levels-present', percentFixture).met).toBe(true);
	});

	it('numeric-value-in-range passes when there are no numeric results', () => {
		expect(run('osa-numeric-value-in-range', rubricCriterionLevelFixture).met).toBe(true);
	});

	it('achieved-level-matches passes when there are no rubric results', () => {
		expect(run('osa-achieved-level-matches', rawScoreFixture).met).toBe(true);
	});
});

describe('the resolved upstream-missing branches (M11)', () => {
	it('every check that reads resultDescription FAILS when it is empty', () => {
		const broken = copy(rawScoreFixture);
		broken.credentialSubject.achievement.resultDescription = [];
		// `osa-result-present` reads `result[]` alone, so it is untouched by this —
		// which is the point of keeping the two `.present` rows separate.
		for (const id of ALL.filter((c) => c !== 'osa-result-present')) {
			const result = run(id, broken);
			expect(result.met, id).toBe(false);
		}
		expect(run('osa-result-present', broken).met).toBe(true);
		// …and says which upstream requirement to read, rather than reporting `n/a`.
		expect(run('osa-recognized-result-type', broken).detail).toMatch(/resultDescription present/i);
	});

	it('every downstream result check FAILS when result[] is empty', () => {
		const broken = copy(rawScoreFixture);
		broken.credentialSubject.result = [];
		for (const id of [
			'osa-result-present',
			'osa-result-links-description',
			'osa-numeric-value-in-range',
			'osa-achieved-level-matches'
		]) {
			expect(run(id, broken).met, id).toBe(false);
		}
		expect(run('osa-result-links-description', broken).detail).toMatch(/result present/i);
	});
});

describe('osa-result-description-present', () => {
	it('fails when the achievement declares no resultDescription at all', () => {
		const broken = copy(rawScoreFixture);
		delete (broken.credentialSubject.achievement as { resultDescription?: unknown })
			.resultDescription;
		expect(run('osa-result-description-present', broken).met).toBe(false);
	});
});

describe('osa-recognized-result-type', () => {
	it('fails on an unrecognised resultType, naming it', () => {
		const broken = copy(rawScoreFixture);
		broken.credentialSubject.achievement.resultDescription[0].resultType = 'LetterGrade';
		const result = run('osa-recognized-result-type', broken);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/LetterGrade/);
	});
});

describe('osa-percent-value-range', () => {
	it('fails when a Percent description does not declare 0–100', () => {
		const broken = copy(percentFixture);
		broken.credentialSubject.achievement.resultDescription[0].valueMax = '10';
		expect(run('osa-percent-value-range', broken).met).toBe(false);
	});
});

describe('osa-rubric-levels-present', () => {
	it('fails when a rubric description declares no levels', () => {
		const broken = copy(rubricCriterionLevelFixture);
		broken.credentialSubject.achievement.resultDescription[0].rubricCriterionLevel = [];
		expect(run('osa-rubric-levels-present', broken).met).toBe(false);
	});
});

describe('osa-ctdl-alignment', () => {
	it('FAILS with no alignments at all — the engine’s `warn`, resolved (M11)', () => {
		const broken = copy(rawScoreFixture);
		for (const description of broken.credentialSubject.achievement.resultDescription) {
			delete (description as { alignment?: unknown }).alignment;
		}
		const result = run('osa-ctdl-alignment', broken);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/credentialengineregistry\.org/);
		expect(result.detail).toMatch(/blessed later/);
	});

	it('FAILS off the allowlist, naming the host — the engine’s second `warn`, resolved (M11)', () => {
		const broken = copy(rawScoreFixture);
		broken.credentialSubject.achievement.resultDescription[0].alignment[0].targetUrl =
			'https://skills.example.org/frameworks/1';
		const result = run('osa-ctdl-alignment', broken);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/skills\.example\.org/);
	});

	it('fails on an unparseable targetUrl, which was already a fail', () => {
		const broken = copy(rawScoreFixture);
		broken.credentialSubject.achievement.resultDescription[0].alignment[0].targetUrl = 'not a url';
		const result = run('osa-ctdl-alignment', broken);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/not a valid URL/i);
	});
});

describe('osa-result-links-description', () => {
	it('fails when a result names an id the achievement does not declare', () => {
		const broken = copy(rawScoreFixture);
		broken.credentialSubject.result[0].resultDescription = 'urn:uuid:no-such-description';
		expect(run('osa-result-links-description', broken).met).toBe(false);
	});
});

describe('osa-numeric-value-in-range', () => {
	it('fails when a value is above the declared maximum, naming the description', () => {
		const broken = copy(percentFixture);
		broken.credentialSubject.result[0].value = '140';
		const result = run('osa-numeric-value-in-range', broken);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/above/);
	});

	it('fails when a value is non-numeric or missing', () => {
		for (const value of ['not-a-number', '']) {
			const broken = copy(percentFixture);
			broken.credentialSubject.result[0].value = value;
			expect(run('osa-numeric-value-in-range', broken).met, value).toBe(false);
		}
	});
});

describe('osa-achieved-level-matches', () => {
	it('fails when achievedLevel matches no declared level', () => {
		const broken = copy(rubricCriterionLevelFixture);
		broken.credentialSubject.result[0].achievedLevel = 'urn:uuid:no-such-level';
		expect(run('osa-achieved-level-matches', broken).met).toBe(false);
	});

	it('fails when achievedLevel is missing', () => {
		const broken = copy(rubricCriterionLevelFixture);
		delete (broken.credentialSubject.result[0] as { achievedLevel?: unknown }).achievedLevel;
		expect(run('osa-achieved-level-matches', broken).met).toBe(false);
	});
});
