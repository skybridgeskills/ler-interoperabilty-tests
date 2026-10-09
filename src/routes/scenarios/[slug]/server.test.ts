import { describe, expect, it, vi } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { load as serverLoad } from './+page.server.js';
import { load as clientLoad } from './+page.ts';

/**
 * The one generic route. What matters here is that an unknown slug 404s, that a
 * scenario's blocked-ness is resolved **on the server before anything renders**
 * (D6), and that attach params reach the page.
 *
 * The catalog is empty until M6, so the loads are exercised against a stubbed
 * `scenarioBySlug` rather than a registered scenario — the route's behaviour is
 * what is under test, not the catalog's contents.
 */

vi.mock('$lib/interop/scenarios/index.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/interop/scenarios/index.js')>();
	return {
		...actual,
		scenarioBySlug: (slug: string) => (slug === 'known' ? scenario : undefined)
	};
});

const step = (intent?: { cryptosuite: string; didMethod: string }) => ({
	id: 'offer',
	title: 'Offer the credential',
	summary: 'We will offer your wallet a credential.',
	action: { kind: 'issue' as const, credential: 'minimal-ob3', ...(intent ? { intent } : {}) },
	requirements: []
});

let scenario = {
	slug: 'known',
	name: 'A scenario',
	blurb: 'One line.',
	role: 'wallet' as const,
	workflow: 'credential-acceptance' as const,
	memberships: [{ profile: 'oid4' as const, level: 'required' as const }],
	steps: [step()]
};

async function withCtx<T>(fn: () => Promise<T> | T): Promise<T> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => fn());
}

const clientArgs = (slug: string, search = '', data: { blocked?: never } = {}) => ({
	url: new URL(`http://localhost/scenarios/${slug}${search}`),
	params: { slug },
	data
});

describe('/scenarios/[slug] — +page.ts', { timeout: 20_000 }, () => {
	it('resolves a known scenario', () => {
		const result = clientLoad(clientArgs('known'));
		expect(result.scenario.slug).toBe('known');
	});

	it('404s an unknown slug', () => {
		expect(() => clientLoad(clientArgs('nope'))).toThrow(expect.objectContaining({ status: 404 }));
	});

	it('passes the attach exchange id through', () => {
		const result = clientLoad(clientArgs('known', '?exchangeId=probe-1'));
		expect(result.attachExchangeId).toBe('probe-1');
	});

	it('ignores ?workflow= — a scenario knows its own', () => {
		const result = clientLoad(clientArgs('known', '?exchangeId=probe-1&workflow=verify'));
		expect(Object.keys(result)).toEqual(['scenario', 'attachExchangeId', 'blocked']);
	});

	it('passes the server load’s blocked reason through', () => {
		const blocked = {
			kind: 'cryptosuite-unavailable',
			requested: 'bbs-2023',
			available: ['eddsa-rdfc-2022']
		} as never;
		const result = clientLoad(clientArgs('known', '', { blocked }));
		expect(result.blocked).toBe(blocked);
	});
});

describe('/scenarios/[slug] — +page.server.ts', { timeout: 20_000 }, () => {
	it('leaves a scenario with no pinned intent unblocked — elective is always servable', async () => {
		scenario = { ...scenario, steps: [step()] };
		const result = await withCtx(() => serverLoad({ params: { slug: 'known' } }));
		expect(result.blocked).toBeUndefined();
	});

	it('blocks a scenario pinned to a cryptosuite this deployment does not serve', async () => {
		scenario = {
			...scenario,
			steps: [step({ cryptosuite: 'bbs-2023', didMethod: 'did:key' })]
		};
		const result = await withCtx(() => serverLoad({ params: { slug: 'known' } }));
		expect(result.blocked?.kind).toBe('cryptosuite-unavailable');
	});

	it('says nothing about an unknown slug — the 404 is +page.ts’s job', async () => {
		const result = await withCtx(() => serverLoad({ params: { slug: 'nope' } }));
		expect(result).toEqual({});
	});
});
