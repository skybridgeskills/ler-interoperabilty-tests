import { describe, expect, it } from 'vitest';

import { evaluateCompletion } from '$lib/interop/completion/index.js';
import { checkById } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The conduct scenarios (M15 P6) and the five `*-recorded` checks they home.
 */

/** Every check the exchange-variation effort shipped with no scenario to carry it. */
const ORPHANED = [
	'oid4vp-query-language-recorded',
	'limit-disclosure-recorded',
	'advertised-cryptosuites-recorded',
	'tamper-recorded',
	'discovery-construction-rfc8414'
] as const;

const SLUGS = [
	'oid4-wallet-presentation-pex',
	'oid4-wallet-presentation-limited',
	'oid4-wallet-discovery',
	'oid4-wallet-tamper-refusal'
] as const;

/** Every automatic checkId named anywhere in the catalog. */
function catalogCheckIds(): Set<string> {
	const ids = new Set<string>();
	for (const scenario of allScenarios) {
		for (const step of scenario.steps) {
			for (const requirement of step.requirements) {
				if (requirement.check.kind === 'automatic') ids.add(requirement.check.checkId);
			}
		}
	}
	return ids;
}

describe('the five orphaned checks', () => {
	it('are ALL named by at least one registered scenario', () => {
		// The phase's acceptance criterion, stated as a test. It is what stops a
		// sixth orphan appearing later: a check registered in `automaticChecks` and
		// named by nothing is unit-tested plumbing that never runs.
		const named = catalogCheckIds();
		expect(ORPHANED.filter((id) => !named.has(id))).toEqual([]);
	});

	it('every check the catalog names is registered', () => {
		// The converse, and cheap: an authored `checkId` typo would otherwise show up
		// as a silently failing requirement in a live run.
		const unregistered = [...catalogCheckIds()].filter((id) => checkById(id) === undefined);
		expect(unregistered).toEqual([]);
	});
});

describe('the conduct scenarios', () => {
	it('are all registered wallet scenarios, `optional` in oid4', () => {
		for (const slug of SLUGS) {
			const scenario = scenarioBySlug(slug);
			expect(scenario, slug).toBeDefined();
			expect(scenario!.role, slug).toBe('wallet');
			// `optional` — the base profile's Expanded tier, and the house convention
			// for a newly authored scenario. NOT `additive-only`: nothing claims these,
			// and catalog rule 4b would reject a scenario no additive names.
			expect(scenario!.memberships, slug).toEqual([{ profile: 'oid4', level: 'optional' }]);
		}
	});

	it('sets `limitDisclosure` only alongside `queryLanguage: pex`', () => {
		// Catalog rule `limit-disclosure-without-pex` enforces this, because DCQL has
		// no such constraint and a scenario setting both would silently measure
		// nothing. Asserted on the authored scenarios too, so a later edit cannot
		// quietly drop the pairing and leave the rule with nothing to catch.
		for (const scenario of allScenarios) {
			for (const step of scenario.steps) {
				const action = step.action;
				if (!action || action.kind !== 'request-presentation') continue;
				if (action.limitDisclosure === undefined) continue;
				expect(action.queryLanguage, scenario.slug).toBe('pex');
			}
		}
		const limited = scenarioBySlug('oid4-wallet-presentation-limited')!.steps[0].action!;
		expect(limited.kind === 'request-presentation' && limited.limitDisclosure).toBe('preferred');
	});

	it('asks for selective disclosure as `preferred`, so a wallet without it still answers', () => {
		const action = scenarioBySlug('oid4-wallet-presentation-limited')!.steps[0].action!;
		if (action.kind === 'request-presentation') {
			expect(action.limitDisclosure).not.toBe('required');
			expect(action.advertiseCryptosuites).toEqual(['ecdsa-sd-2023', 'bbs-2023']);
		}
	});

	it('homes `tamper-recorded` on a NON-shuffled scenario, which is the whole reason it exists', () => {
		// Automatic outcomes resolve live rather than deferring to the end-of-run
		// reveal, so putting this row on a discrimination scenario's tampered pass
		// alone would give that pass a visible row the others lack — telling the
		// operator which credential is corrupted, which is exactly what the shuffled
		// design prevents.
		const scenario = scenarioBySlug('oid4-wallet-tamper-refusal')!;
		expect(scenario.steps.every((s) => s.shuffle === undefined)).toBe(true);
		expect(scenario.shuffleLabel).toBeUndefined();

		// And the discrimination scenarios still do NOT carry it.
		for (const slug of [
			'oid4-wallet-refusal-discrimination',
			'vcalm-wallet-refusal-discrimination'
		]) {
			const ids = scenarioBySlug(slug)!
				.steps.flatMap((s) => s.requirements)
				.flatMap((r) => (r.check.kind === 'automatic' ? [r.check.checkId] : []));
			expect(ids, slug).not.toContain('tamper-recorded');
		}
	});

	it('leaves every shipped scenario’s fingerprint untouched — no stored run is dropped', () => {
		// These are new siblings, deliberately, rather than conduct fields added to
		// `oid4-wallet-presentation`. An action IS inside the fingerprint, so that
		// would have dropped every stored run of a shipped scenario.
		const shipped = ['oid4-wallet-presentation', 'oid4-wallet-acceptance'] as const;
		for (const slug of shipped) {
			const scenario = scenarioBySlug(slug)!;
			const actions = scenario.steps.map((s) => s.action);
			// The shipped presentation scenario carries NO conduct fields.
			for (const action of actions) {
				if (action?.kind !== 'request-presentation') continue;
				expect(action.queryLanguage, slug).toBeUndefined();
				expect(action.limitDisclosure, slug).toBeUndefined();
				expect(action.advertiseCryptosuites, slug).toBeUndefined();
			}
			expect(typeof scenarioFingerprint(scenario)).toBe('string');
		}
	});

	it('populates the oid4 wallet Expanded tier rather than its Essential meter', () => {
		const result = evaluateCompletion({ profile: 'oid4', role: 'wallet', runs: {} });
		const optionalSlugs = result.optional.obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);
		const baseSlugs = result.obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);
		for (const slug of SLUGS) {
			expect(optionalSlugs, slug).toContain(slug);
			expect(baseSlugs, slug).not.toContain(slug);
		}
	});

	it('keeps the whole catalog valid', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});
