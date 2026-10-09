import { describe, expect, it } from 'vitest';

import { allScenarios } from '$lib/interop/scenarios/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { load } from './+page.server.js';

/**
 * The homepage's server load — the last of the four scenario surfaces to resolve
 * blocked-ness, and the reason `LandingPage` takes it as a prop rather than
 * reading config.
 *
 * The test context is the ordinary single-tenant deployment: `eddsa-rdfc-2022`
 * over `did:key` and nothing else. So a scenario is blocked here exactly when it
 * pins something other than that pair, and the test states that biconditional
 * rather than listing slugs, which would go stale with every catalog addition.
 */
const SERVED = { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' };

function withCtx<T>(fn: () => T): Promise<T> {
	return buildAppContext({ CONTEXT: 'test' }).then((ctx) => runInContext(ctx, fn));
}

/** Whether any step pins a `(cryptosuite, didMethod)` this deployment does not serve. */
function pinsSomethingElse(scenario: (typeof allScenarios)[number]): boolean {
	return scenario.steps.some((step) => {
		const intent = step.action && 'intent' in step.action ? step.action.intent : undefined;
		if (!intent) return false;
		return intent.cryptosuite !== SERVED.cryptosuite || intent.didMethod !== SERVED.didMethod;
	});
}

describe('GET / load', { timeout: 20_000 }, () => {
	it('blocks a scenario exactly when it pins something this deployment cannot serve', async () => {
		await withCtx(() => {
			const { blocked } = load();

			for (const scenario of allScenarios) {
				expect(scenario.slug in blocked, scenario.slug).toBe(pinsSomethingElse(scenario));
			}
		});
	});

	it('resolves the whole catalog, so the answer does not depend on the reader’s filter', async () => {
		await withCtx(() => {
			const { blocked } = load();

			// The filter is a client-side concern. Every key must name a real scenario:
			// the completion model looks scenarios up in this map by slug, so a stray
			// key would silently do nothing at all.
			const slugs = new Set(allScenarios.map((s) => s.slug));
			expect(Object.keys(blocked).filter((slug) => !slugs.has(slug))).toEqual([]);
		});
	});
});
