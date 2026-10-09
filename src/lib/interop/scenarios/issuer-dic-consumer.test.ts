import { describe, expect, it } from 'vitest';

import { evaluateCompletion } from '$lib/interop/completion/index.js';
import { checkById } from '$lib/interop/scenario-run/index.js';
import { ExchangeRunnerConfig } from '$lib/server/domain/exchange-runner/exchange-runner-config.js';
import { blockedScenarios } from '$lib/server/domain/scenario-runner/blocked-scenarios.js';

import { validateCatalog } from './catalog-validation.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The four `data-integrity-cryptosuites` **issuer consumer** scenarios (M15 P4)
 * — the one DIC axis never measured under any model.
 */

const EDDSA = ['vcalm-issuer-consumer-eddsa', 'oid4-issuer-consumer-eddsa'] as const;
const ECDSA = ['vcalm-issuer-consumer-ecdsa', 'oid4-issuer-consumer-ecdsa'] as const;
const ALL = [...EDDSA, ...ECDSA];

/** The single-tenant EdDSA deployment — the ordinary case. */
const singleTenant = ExchangeRunnerConfig({
	enabled: true,
	transactionServiceUrl: 'http://lits.test:4004',
	tenantName: 'default',
	tenantToken: 'shh',
	exchangeHost: 'http://lits.test:4004',
	cryptosuite: 'eddsa-rdfc-2022',
	didMethod: 'key'
});

const actionOf = (slug: string) => scenarioBySlug(slug)!.steps[0].action!;
const requirementIds = (slug: string) =>
	scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id);
const checkOf = (slug: string, id: string) => {
	const requirement = scenarioBySlug(slug)!.steps[0].requirements.find((r) => r.id === id)!;
	return requirement.check.kind === 'automatic' ? requirement.check.checkId : '';
};

describe('the four DIC issuer consumer scenarios', () => {
	it('are all registered single-step issuer scenarios', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug);
			expect(scenario, slug).toBeDefined();
			expect(scenario!.role, slug).toBe('issuer');
			expect(scenario!.workflow, slug).toBe('credential-issuance');
			expect(scenario!.steps, slug).toHaveLength(1);
		}
	});

	it('vary `keyProofSuite`, which is the whole axis', () => {
		for (const slug of EDDSA) {
			const action = actionOf(slug);
			expect(action.kind, slug).toBe('receive-from-issuer');
			if (action.kind === 'receive-from-issuer') {
				expect(action.keyProofSuite, slug).toBe('eddsa-rdfc-2022');
			}
		}
		for (const slug of ECDSA) {
			const action = actionOf(slug);
			if (action.kind === 'receive-from-issuer') {
				expect(action.keyProofSuite, slug).toBe('ecdsa-rdfc-2019');
			}
		}
	});

	it('are LIVE transports only — a paste carries no key proof to verify', () => {
		const transports = ALL.map((slug) => {
			const action = actionOf(slug);
			return action.kind === 'receive-from-issuer' ? action.transport : '';
		});
		expect(transports).not.toContain('direct');
		expect([...transports].sort()).toEqual(['oid4vci', 'oid4vci', 'vcalm', 'vcalm']);
	});

	it('carry NO `intent`, and can never be blocked — the key is generated locally', () => {
		// The distinction from M12's wallet accept axis, which pins an
		// `IssuingIntent` the transaction service must mint under. Asserted through
		// `blockedScenarios` rather than by the field's absence alone, because the
		// invariant is "never renders disabled", not "has no property".
		for (const slug of ALL) {
			const action = actionOf(slug);
			expect('intent' in action, slug).toBe(false);
		}

		const scenarios = ALL.map((slug) => scenarioBySlug(slug)!);
		expect(blockedScenarios(singleTenant, scenarios)).toEqual({});
	});

	it('declare the shared two ids, plus an OID4VCI-only third', () => {
		// The two members of a suite pair declare DIFFERENT requirement ids. Legal
		// since M15 dropped the `oneOf` groups; it would have broken rule 5 before.
		// VCALM advertises no key-proof algorithm list for the third row to read.
		expect(requirementIds('vcalm-issuer-consumer-eddsa')).toEqual([
			'accepted-key-proof',
			'key-proof-suite'
		]);
		expect(requirementIds('oid4-issuer-consumer-eddsa')).toEqual([
			'accepted-key-proof',
			'key-proof-suite',
			'advertises-key-proof-suite'
		]);
	});

	it('makes only the advertising row a SHOULD — advertising is not accepting', () => {
		for (const slug of ALL) {
			const shoulds = scenarioBySlug(slug)!
				.steps[0].requirements.filter((r) => r.level === 'SHOULD')
				.map((r) => r.id);
			const action = actionOf(slug);
			const isOid4 = action.kind === 'receive-from-issuer' && action.transport === 'oid4vci';
			expect(shoulds, slug).toEqual(isOid4 ? ['advertises-key-proof-suite'] : []);
		}
	});

	it('resolves every checkId, per suite', () => {
		for (const slug of EDDSA) {
			expect(checkOf(slug, 'accepted-key-proof')).toBe('issuer-accepted-key-proof-eddsa');
			expect(checkOf(slug, 'key-proof-suite')).toBe('issuer-key-proof-suite-eddsa');
		}
		for (const slug of ECDSA) {
			expect(checkOf(slug, 'accepted-key-proof')).toBe('issuer-accepted-key-proof-ecdsa');
			expect(checkOf(slug, 'key-proof-suite')).toBe('issuer-key-proof-suite-ecdsa');
		}
		for (const slug of ALL) {
			for (const requirement of scenarioBySlug(slug)!.steps[0].requirements) {
				if (requirement.check.kind !== 'automatic') continue;
				expect(checkById(requirement.check.checkId), requirement.check.checkId).toBeDefined();
			}
		}
	});

	it('are `additive-only` in their base profile and `required` in the additive', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug)!;
			const base = scenario.memberships.find((m) => m.profile !== 'data-integrity-cryptosuites')!;
			const dic = scenario.memberships.find((m) => m.profile === 'data-integrity-cryptosuites')!;
			expect(base.level, slug).toBe('additive-only');
			expect(dic.level, slug).toBe('required');
		}
		// Each names the base profile that hosts its transport.
		expect(
			ALL.map(
				(slug) =>
					scenarioBySlug(slug)!.memberships.find(
						(m) => m.profile !== 'data-integrity-cryptosuites'
					)!.profile
			)
		).toEqual(['vcalm', 'oid4', 'vcalm', 'oid4']);
	});

	it('keeps the whole catalog valid', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('DIC’s issuer meter, after the consumer axis', () => {
	it('counts the consumer scenarios alongside the producer ones', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'issuer',
			runs: {}
		});
		const slugs = result.obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);
		for (const slug of ALL) expect(slugs, slug).toContain(slug);
	});

	it('leaves every base profile’s Essential and Expanded meters unchanged', () => {
		// `additive-only`: the base names these and claims none of them.
		for (const profile of ['vcalm', 'oid4'] as const) {
			const base = evaluateCompletion({ profile, role: 'issuer', runs: {} });
			const slugs = [
				...base.obligations.flatMap((o) =>
					o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
				),
				...base.optional.obligations.flatMap((o) =>
					o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
				)
			];
			expect(slugs, profile).toEqual(expect.not.arrayContaining([...ALL]));
		}
	});
});
