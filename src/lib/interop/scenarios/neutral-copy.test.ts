import { describe, expect, it } from 'vitest';

import { allScenarios } from './all-scenarios.js';

/**
 * Scenario copy is neutral third person.
 *
 * The same catalog serves whoever runs it — the team that builds the product,
 * or someone evaluating a product they do not own — so no copy may say "your
 * wallet", "your issuer" or "your verifier". The product is "the wallet"; the
 * person holding the phone is still "you", mid-sentence. A requirement
 * statement never opens with "You", because a statement describes what the
 * product did, not what the operator did.
 *
 * Every offender is collected and reported at once, so a failure names each
 * slug, field and string rather than stopping at the first.
 *
 * **`framing` is deliberately not scanned.** It is the one place a scenario
 * addresses a reader by Perspective — the Builder's paragraph says "your
 * wallet" because it is written to the wallet's owner — and it renders only
 * once a Perspective is chosen. The neutral rule governs everything both
 * readers see.
 */

const SECOND_PERSON_PRODUCT = /\byour\b/i;
const OPENS_WITH_YOU = /^You\b/;

type Offender = { slug: string; field: string; text: string };

function catalogCopy(): { slug: string; field: string; text: string; statement: boolean }[] {
	return allScenarios.flatMap((scenario) => [
		{ slug: scenario.slug, field: 'blurb', text: scenario.blurb, statement: false },
		...scenario.steps.flatMap((step) => [
			{
				slug: scenario.slug,
				field: `steps.${step.id}.summary`,
				text: step.summary,
				statement: false
			},
			...step.requirements.map((requirement) => ({
				slug: scenario.slug,
				field: `steps.${step.id}.requirements.${requirement.id}.statement`,
				text: requirement.statement,
				statement: true
			}))
		])
	]);
}

describe('neutral scenario copy', () => {
	it('covers a non-empty catalog', () => {
		expect(allScenarios.length).toBeGreaterThan(0);
	});

	it('never addresses the product as "your"', () => {
		const offenders: Offender[] = catalogCopy()
			.filter(({ text }) => SECOND_PERSON_PRODUCT.test(text))
			.map(({ slug, field, text }) => ({ slug, field, text }));
		expect(offenders).toEqual([]);
	});

	it('never opens a requirement statement with "You"', () => {
		const offenders: Offender[] = catalogCopy()
			.filter(({ statement, text }) => statement && OPENS_WITH_YOU.test(text))
			.map(({ slug, field, text }) => ({ slug, field, text }));
		expect(offenders).toEqual([]);
	});
});
