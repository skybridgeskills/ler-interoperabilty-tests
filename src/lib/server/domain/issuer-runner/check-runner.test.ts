import { describe, expect, it } from 'vitest';

import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';
import { openSkillAlignment } from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
import { profileBySlug } from '$lib/interop/index.js';

import { CheckRunner } from './check-runner.js';
import type { ChecklistGroupRef } from './issuer-runner-report.js';

const runner = CheckRunner();

const ob3 = profileBySlug('ob3-direct-delivery')!;
const baseChecklist = ob3.checklists.find(
	(c) => c.role === 'issuer' && c.workflow === 'direct-credential-issuance'
)!;
const additiveChecklist = openSkillAlignment.checklists.find(
	(c) => c.role === 'issuer' && c.workflow === 'direct-credential-issuance'
)!;

const baseGroupRef: ChecklistGroupRef = {
	kind: 'base',
	profileSlug: 'ob3-direct-delivery',
	profileName: ob3.name,
	workflow: 'direct-credential-issuance',
	role: 'issuer'
};

const additiveGroupRef: ChecklistGroupRef = {
	kind: 'additive',
	profileSlug: 'open-skill-alignment',
	profileName: openSkillAlignment.name,
	workflow: 'direct-credential-issuance',
	role: 'issuer'
};

describe('CheckRunner.run', () => {
	it('reports verified=true and all MUSTs passing for a clean fixture (additive on)', () => {
		const report = runner.run({
			credential: rawScoreFixture,
			verifierResult: { verified: true, log: [{ id: 'valid_signature', valid: true }] },
			includeAdditive: true,
			checklists: [
				{ groupRef: baseGroupRef, checklist: baseChecklist },
				{ groupRef: additiveGroupRef, checklist: additiveChecklist }
			]
		});
		expect(report.verified).toBe(true);
		expect(report.groups).toHaveLength(2);
		const allMustOutcomes = report.groups
			.flatMap((g) => g.outcomes)
			.filter((o) => o.level === 'MUST');
		const failingMust = allMustOutcomes.filter((o) => o.status === 'fail');
		expect(failingMust).toHaveLength(0);
	});

	it('flips verified to false when a MUST fails', () => {
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.proof.cryptosuite = 'bbs-2023';
		const report = runner.run({
			credential: broken,
			verifierResult: { verified: true },
			includeAdditive: false,
			checklists: [{ groupRef: baseGroupRef, checklist: baseChecklist }]
		});
		expect(report.verified).toBe(false);
		const target = report.groups[0].outcomes.find(
			(o) => o.id === 'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022'
		);
		expect(target?.status).toBe('fail');
	});

	it('keeps verified=true when only SHOULD/MAY fail', () => {
		// rawScoreFixture has no validUntil, so the SHOULD check is n/a not fail.
		// Use the off-allowlist case which only emits warn on a SHOULD.
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.credentialSubject.achievement.resultDescription[0].alignment[0].targetUrl =
			'https://other-registry.example.org/skill/x';
		const report = runner.run({
			credential: broken,
			verifierResult: { verified: true },
			includeAdditive: true,
			checklists: [
				{ groupRef: baseGroupRef, checklist: baseChecklist },
				{ groupRef: additiveGroupRef, checklist: additiveChecklist }
			]
		});
		expect(report.verified).toBe(true);
		const ctdlOutcome = report.groups
			.flatMap((g) => g.outcomes)
			.find((o) => o.id === 'open-skill-alignment.result-description.ctdl-alignment');
		expect(ctdlOutcome?.status).toBe('warn');
	});

	it('drops the additive group when not requested', () => {
		const report = runner.run({
			credential: rawScoreFixture,
			verifierResult: { verified: true },
			includeAdditive: false,
			checklists: [{ groupRef: baseGroupRef, checklist: baseChecklist }]
		});
		expect(report.groups).toHaveLength(1);
		expect(report.groups[0].checklist.kind).toBe('base');
	});

	it('marks unregistered requirement ids as n/a', () => {
		const stubChecklist = {
			...baseChecklist,
			steps: [
				{
					title: 'Stub step',
					summary: 'A step whose requirement is not registered.',
					requirements: [
						{
							id: 'never-registered.some-rule',
							level: 'MUST' as const,
							text: 'A rule with no automated check.'
						}
					]
				}
			]
		};
		const report = runner.run({
			credential: rawScoreFixture,
			verifierResult: { verified: true },
			includeAdditive: false,
			checklists: [{ groupRef: baseGroupRef, checklist: stubChecklist }]
		});
		expect(report.groups[0].outcomes[0].status).toBe('n/a');
		// MUST + n/a does NOT flip `verified` — `verified` only flips on
		// an explicit `fail` on a MUST. n/a means "couldn't check from
		// the credential alone" and is treated as benign.
		expect(report.verified).toBe(true);
	});
});
