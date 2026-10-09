import { describe, expect, it } from 'vitest';

import { allAdditiveProfiles } from './additive-profiles/all-additive-profiles.js';
import { allProfiles } from './profiles/all-profiles.js';
import { allScenarios } from './scenarios/all-scenarios.js';
import { allStandards, citationHref, type StandardCitation, standardById } from './standards.js';

/**
 * The catalog's citations against the register. The schema already enforces a
 * known id, a bare anchor and at least one citation per scenario and Standard
 * Profile; these pin the same facts over the real catalog and add the one rule
 * no single entry can check: every register entry is cited somewhere.
 */
const cited: { owner: string; citation: StandardCitation }[] = [
	...allScenarios.flatMap((s) => s.standards.map((citation) => ({ owner: s.slug, citation }))),
	...allProfiles.flatMap((p) => p.standards.map((citation) => ({ owner: p.slug, citation }))),
	...allAdditiveProfiles.flatMap((a) =>
		(a.standards ?? []).map((citation) => ({ owner: a.slug, citation }))
	)
];

describe('standards citations across the catalog', () => {
	it('every scenario and Standard Profile cites at least one standard', () => {
		expect(allScenarios.filter((s) => s.standards.length === 0).map((s) => s.slug)).toEqual([]);
		expect(allProfiles.filter((p) => p.standards.length === 0).map((p) => p.slug)).toEqual([]);
	});

	it('both add-ons say what they are built on', () => {
		expect(allAdditiveProfiles.filter((a) => !a.standards?.length).map((a) => a.slug)).toEqual([]);
	});

	it('every cited standard is in the register and resolves to a link', () => {
		for (const { citation } of cited) {
			expect(() => standardById(citation.standard)).not.toThrow();
			expect(citationHref(citation)).toMatch(/^https:\/\//);
		}
	});

	it('every section is a bare anchor', () => {
		const bad = cited.filter(({ citation }) => citation.section && /[#/\s]/.test(citation.section));
		expect(bad).toEqual([]);
	});

	it('every register entry is cited by some scenario, Standard Profile or add-on', () => {
		const used = new Set(cited.map(({ citation }) => citation.standard));
		expect(allStandards.filter((s) => !used.has(s.id)).map((s) => s.id)).toEqual([]);
	});
});
