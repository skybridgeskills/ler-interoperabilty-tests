import { describe, expect, it } from 'vitest';

import { evaluateCompletion } from '$lib/interop/completion/index.js';
import { ExchangeRunnerConfig } from '$lib/server/domain/exchange-runner/exchange-runner-config.js';
import { blockedScenarios } from '$lib/server/domain/scenario-runner/blocked-scenarios.js';

import { validateCatalog } from './catalog-validation.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The six `data-integrity-cryptosuites` **verifier** scenarios (M15 P5) — the
 * role's first additive axis, and the first consumer of P2's locally-signed
 * cryptosuite field.
 */

const EDDSA = ['ob3-direct-verifier-eddsa', 'vcalm-verifier-eddsa', 'oid4-verifier-eddsa'] as const;
const ECDSA = ['ob3-direct-verifier-ecdsa', 'vcalm-verifier-ecdsa', 'oid4-verifier-ecdsa'] as const;
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

const stepsOf = (slug: string) => scenarioBySlug(slug)!.steps;

/** Every step's `cryptosuite`, whichever action kind carries it. */
function suitesOf(slug: string): (string | undefined)[] {
	return stepsOf(slug).map((step) => {
		const action = step.action;
		return action && 'cryptosuite' in action ? action.cryptosuite : undefined;
	});
}

describe('the six DIC verifier scenarios', () => {
	it('are all registered verifier scenarios with two shuffled passes', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug);
			expect(scenario, slug).toBeDefined();
			expect(scenario!.role, slug).toBe('verifier');
			// Two passes, not the base scenarios' four: the schema and expiry defects
			// are suite-independent, so repeating them per suite measures nothing new.
			expect(scenario!.steps, slug).toHaveLength(2);
			expect(
				scenario!.steps.every((s) => s.shuffle === true),
				slug
			).toBe(true);
			expect(scenario!.shuffleLabel, slug).toBe('Credential');
		}
	});

	it('pins its suite on EVERY pass — one unpinned pass would measure the default', () => {
		for (const slug of EDDSA)
			expect(suitesOf(slug), slug).toEqual(['eddsa-rdfc-2022', 'eddsa-rdfc-2022']);
		for (const slug of ECDSA)
			expect(suitesOf(slug), slug).toEqual(['ecdsa-rdfc-2019', 'ecdsa-rdfc-2019']);
	});

	it('is NEVER blockable — the suite signs these locally', () => {
		// P2's guarantee, and this axis is its first real consumer. Before P2 a
		// locally-signed ECDSA hand-off resolved through the tenant map and would
		// have rendered disabled on the deployment below.
		expect(
			blockedScenarios(
				singleTenant,
				ALL.map((slug) => scenarioBySlug(slug)!)
			)
		).toEqual({});
	});

	it('presents over the live transports and hands over directly, never the reverse', () => {
		for (const slug of ['ob3-direct-verifier-eddsa', 'ob3-direct-verifier-ecdsa']) {
			// A file the operator moves out of band — there is no presentation to make.
			expect(
				stepsOf(slug).map((s) => s.action?.kind),
				slug
			).toEqual(['deliver-direct', 'deliver-direct']);
		}
		for (const slug of ['vcalm-verifier-eddsa', 'oid4-verifier-eddsa']) {
			expect(
				stepsOf(slug).map((s) => s.action?.kind),
				slug
			).toEqual(['present-to-verifier', 'present-to-verifier']);
		}
		const transportOf = (slug: string) => {
			const action = stepsOf(slug)[0].action!;
			return action.kind === 'present-to-verifier' ? action.transport : undefined;
		};
		expect(transportOf('vcalm-verifier-eddsa')).toBe('vcalm');
		expect(transportOf('oid4-verifier-eddsa')).toBe('oid4vp');
	});

	it('corrupts exactly one of the two passes, and only the proof', () => {
		for (const slug of ALL) {
			const tampers = stepsOf(slug).map((s) => {
				const action = s.action;
				return action && 'tamper' in action ? action.tamper : undefined;
			});
			expect(tampers, slug).toEqual([undefined, 'proof']);
		}
	});

	it('asks the identical questions on both passes, so position and shape leak nothing', () => {
		for (const slug of ALL) {
			const shapes = stepsOf(slug).map((step) =>
				step.requirements.map(
					(r) => `${r.id.replace(/^[a-z-]+?-(verdict|reason)$/, '$1')}:${r.level}`
				)
			);
			expect(shapes[0], slug).toEqual(shapes[1]);
		}
	});

	it('keeps the right answers right — accept the valid one, reject the corrupted one', () => {
		for (const slug of ALL) {
			const correctOf = (stepIndex: number, suffix: string) => {
				const requirement = stepsOf(slug)[stepIndex].requirements.find((r) =>
					r.id.endsWith(suffix)
				)!;
				return requirement.check.kind === 'attested' && requirement.check.answer.kind === 'choose'
					? requirement.check.answer.correct
					: '';
			};
			expect(correctOf(0, 'verdict'), slug).toBe('accepted');
			expect(correctOf(0, 'reason'), slug).toBe('none');
			expect(correctOf(1, 'verdict'), slug).toBe('rejected');
			expect(correctOf(1, 'reason'), slug).toBe('signature');
		}
	});

	it('keeps `schema` and `expiry` on offer, though neither is ever correct here', () => {
		// Removing them would narrow the guess and tell the operator what kind of
		// defect to expect, which is the whole thing a discrimination scenario hides.
		const options = stepsOf(ALL[0])[0].requirements.find((r) => r.id.endsWith('reason'))!;
		const values =
			options.check.kind === 'attested' && options.check.answer.kind === 'choose'
				? options.check.answer.options.map((o) => o.value)
				: [];
		expect(values).toEqual(['none', 'signature', 'schema', 'expiry', 'other']);
	});

	it('are `additive-only` in their base profile and `required` in the additive', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug)!;
			const base = scenario.memberships.find((m) => m.profile !== 'data-integrity-cryptosuites')!;
			const dic = scenario.memberships.find((m) => m.profile === 'data-integrity-cryptosuites')!;
			expect(base.level, slug).toBe('additive-only');
			expect(dic.level, slug).toBe('required');
		}
	});

	it('keeps the whole catalog valid — contiguous shuffle, labelled, right answers on offer', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('DIC’s verifier meter', () => {
	it('exists at all, which it did not before M15', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'verifier',
			runs: {}
		});
		expect(result.obligations).toHaveLength(6);
		// Two passes × two requirements each.
		expect(result.total).toBe(24);
	});

	it('leaves every base profile’s verifier meters unchanged', () => {
		for (const profile of ['ob3-direct-delivery', 'vcalm', 'oid4'] as const) {
			const base = evaluateCompletion({ profile, role: 'verifier', runs: {} });
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
