import { baseProfilesOf, oneOfGroupOf } from './membership.js';
import type { Scenario } from './scenario-schema.js';

/** Which rule a {@link CatalogViolation} broke. */
export type CatalogViolationCode =
	| 'duplicate-scenario-slug'
	| 'duplicate-step-id'
	| 'duplicate-requirement-id'
	| 'base-membership-count'
	| 'one-of-requirement-mismatch'
	| 'choose-correct-not-an-option'
	| 'discontiguous-shuffle'
	| 'missing-shuffle-label';

/** One authoring error found in the catalog. */
export type CatalogViolation = {
	code: CatalogViolationCode;
	/** The scenario at fault, or the group name for a cross-scenario rule. */
	subject: string;
	message: string;
};

/**
 * Check every catalog rule and return **all** violations found, in a stable
 * order. Pure — see {@link assertValidCatalog} for the throwing wrapper the
 * registry uses.
 *
 * Returning rather than throwing is what lets a bad catalog report everything
 * at once: an author fixing one violation should not have to re-run to discover
 * the next.
 */
export function validateCatalog(scenarios: Scenario[]): CatalogViolation[] {
	return [
		...uniqueSlugs(scenarios),
		...scenarios.flatMap(uniqueStepIds),
		...scenarios.flatMap(uniqueRequirementIds),
		...scenarios.flatMap(exactlyOneBaseMembership),
		...scenarios.flatMap(chooseCorrectIsAnOption),
		...scenarios.flatMap(contiguousShuffle),
		...scenarios.flatMap(shuffledScenarioDeclaresLabel),
		...oneOfGroupsAgree(scenarios)
	];
}

/**
 * Throw unless the catalog is valid, naming every violation.
 *
 * Throwing at module evaluation is correct here: an invalid catalog is a
 * build-time authoring bug, not a runtime condition, and failing loudly at
 * import beats rendering a meter whose denominator is quietly wrong.
 */
export function assertValidCatalog(scenarios: Scenario[]): void {
	const violations = validateCatalog(scenarios);
	if (violations.length === 0) return;
	throw new Error(
		[
			`Invalid scenario catalog — ${violations.length} violation(s):`,
			...violations.map((v) => `  [${v.code}] ${v.subject}: ${v.message}`)
		].join('\n')
	);
}

/** Rule 1 — scenario slugs are unique across the catalog. */
function uniqueSlugs(scenarios: Scenario[]): CatalogViolation[] {
	return duplicatesOf(scenarios.map((s) => s.slug)).map((slug) => ({
		code: 'duplicate-scenario-slug' as const,
		subject: slug,
		message: 'more than one scenario declares this slug'
	}));
}

/** Rule 2 — step ids are unique within a scenario; run evidence is keyed by them. */
function uniqueStepIds(scenario: Scenario): CatalogViolation[] {
	return duplicatesOf(scenario.steps.map((s) => s.id)).map((id) => ({
		code: 'duplicate-step-id' as const,
		subject: scenario.slug,
		message: `step id "${id}" is declared more than once`
	}));
}

/** Rule 3 — requirement ids are unique within a scenario; result outcomes are keyed by them. */
function uniqueRequirementIds(scenario: Scenario): CatalogViolation[] {
	return duplicatesOf(requirementIdsOf(scenario)).map((id) => ({
		code: 'duplicate-requirement-id' as const,
		subject: scenario.slug,
		message: `requirement id "${id}" is declared more than once`
	}));
}

/**
 * Rule 4 — exactly one membership names a base profile.
 *
 * Zero leaves the scenario with no delivery protocol and no completion set to
 * count toward. More than one would make it a cross-profile scenario, which the
 * model deliberately cannot express today.
 */
function exactlyOneBaseMembership(scenario: Scenario): CatalogViolation[] {
	const bases = baseProfilesOf(scenario.memberships);
	if (bases.length === 1) return [];
	return [
		{
			code: 'base-membership-count',
			subject: scenario.slug,
			message:
				bases.length === 0
					? 'no membership names a base profile; exactly one must'
					: `${bases.length} memberships name base profiles (${bases.join(', ')}); exactly one must`
		}
	];
}

/** Rule 6 — a `choose` answer's `correct` is one of its own option values. */
function chooseCorrectIsAnOption(scenario: Scenario): CatalogViolation[] {
	const violations: CatalogViolation[] = [];
	for (const step of scenario.steps) {
		for (const requirement of step.requirements) {
			const { check } = requirement;
			if (check.kind !== 'attested' || check.answer.kind !== 'choose') continue;
			const values = check.answer.options.map((o) => o.value);
			if (values.includes(check.answer.correct)) continue;
			violations.push({
				code: 'choose-correct-not-an-option',
				subject: scenario.slug,
				message: `requirement "${requirement.id}" has correct="${check.answer.correct}", which is not one of its options (${values.join(', ')})`
			});
		}
	}
	return violations;
}

/**
 * Rule 7 — shuffled steps form a single contiguous run.
 *
 * Contiguity is what makes "permute together" mean anything. Two disjoint
 * shuffled runs in one scenario is an authoring mistake with no coherent
 * reading: the author either meant them to permute together, in which case the
 * unshuffled step between them is misplaced, or meant two scenarios. A single
 * shuffled step is legal — it simply permutes with itself.
 */
function contiguousShuffle(scenario: Scenario): CatalogViolation[] {
	let runs = 0;
	let inRun = false;
	for (const step of scenario.steps) {
		const shuffled = step.shuffle === true;
		if (shuffled && !inRun) runs++;
		inRun = shuffled;
	}
	if (runs <= 1) return [];
	return [
		{
			code: 'discontiguous-shuffle',
			subject: scenario.slug,
			message: `${runs} separate runs of shuffled steps; shuffled steps must be contiguous`
		}
	];
}

/**
 * Rule 8 — a scenario with any shuffled step declares `shuffleLabel`.
 *
 * A shuffled step's authored `title` is an answer key. Without a neutral label
 * the page has nothing else to render and would have to fall back to `title`,
 * which is the exact leak `shuffleLabel` exists to prevent — so this is caught
 * at authoring time rather than left to the page to handle gracefully.
 *
 * The converse — `shuffleLabel` declared with no shuffled step — is **not** a
 * violation. It is unused presentation copy, harmless, and a scenario that
 * gains a shuffled step later should not have to add the field in the same
 * edit.
 */
function shuffledScenarioDeclaresLabel(scenario: Scenario): CatalogViolation[] {
	const shuffled = scenario.steps.filter((s) => s.shuffle === true);
	if (shuffled.length === 0 || scenario.shuffleLabel) return [];
	return [
		{
			code: 'missing-shuffle-label',
			subject: scenario.slug,
			message: `${shuffled.length} shuffled step(s) but no shuffleLabel; a shuffled step's title is an answer key and cannot be rendered`
		}
	];
}

/**
 * Rule 5 — every member of a `oneOf` group declares the same requirement ids.
 *
 * The load-bearing rule. A group is **one obligation**, so the completion
 * meter's denominator must not depend on which alternative the operator
 * happened to run. Two deployments running different members of the same group
 * have to arrive at the same numbers.
 */
function oneOfGroupsAgree(scenarios: Scenario[]): CatalogViolation[] {
	const groups = new Map<string, Scenario[]>();
	for (const scenario of scenarios) {
		for (const membership of scenario.memberships) {
			const group = oneOfGroupOf(membership.level);
			if (!group) continue;
			const members = groups.get(group) ?? [];
			if (!members.includes(scenario)) members.push(scenario);
			groups.set(group, members);
		}
	}

	const violations: CatalogViolation[] = [];
	for (const [group, members] of groups) {
		const signatures = members.map((s) => ({
			slug: s.slug,
			signature: requirementIdsOf(s).slice().sort().join(',')
		}));
		const expected = signatures[0].signature;
		const divergent = signatures.filter((s) => s.signature !== expected);
		if (divergent.length === 0) continue;
		violations.push({
			code: 'one-of-requirement-mismatch',
			subject: group,
			message: `members declare different requirement ids: ${signatures
				.map((s) => `${s.slug} → [${s.signature}]`)
				.join('; ')}`
		});
	}
	return violations;
}

/** Every requirement id in a scenario, in step-then-requirement order. */
function requirementIdsOf(scenario: Scenario): string[] {
	return scenario.steps.flatMap((step) => step.requirements.map((r) => r.id));
}

/** The distinct values that occur more than once, in first-seen order. */
function duplicatesOf(values: string[]): string[] {
	const seen = new Set<string>();
	const duplicated = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) duplicated.add(value);
		seen.add(value);
	}
	return [...duplicated];
}
