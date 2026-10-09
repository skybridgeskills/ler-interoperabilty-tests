import { describe, expect, it } from 'vitest';

import { allScenarios } from '$lib/interop/scenarios/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { load as serverLoad } from './+page.server.js';
import { prerender } from './+page.ts';

/**
 * The profile page's server load, and the prerender flip that had to come with
 * it.
 *
 * A prerendered page bakes one deployment's answer into the build and serves it
 * to every other — which for blocked-ness would be a lie the reader has no way
 * to see. The flip is the point of this file as much as the load is.
 */
function withCtx<T>(fn: () => T): Promise<T> {
	return buildAppContext({ CONTEXT: 'test' }).then((ctx) => runInContext(ctx, fn));
}

describe('GET /profiles/[profile] load', { timeout: 20_000 }, () => {
	it('is not prerendered — blocked-ness is deployment configuration, not build output', () => {
		expect(prerender).toBe(false);
	});

	it('resolves blocked-ness server-side, keyed by scenario slug', async () => {
		await withCtx(() => {
			const { blocked } = serverLoad();

			const slugs = new Set(allScenarios.map((s) => s.slug));
			expect(Object.keys(blocked).filter((slug) => !slugs.has(slug))).toEqual([]);
		});
	});

	it('agrees with the homepage — one deployment, one answer, whichever page you are on', async () => {
		const [fromProfile, fromHome] = await withCtx(async () => {
			const { load: homeLoad } = await import('../../+page.server.js');
			return [serverLoad().blocked, homeLoad().blocked];
		});

		expect(fromProfile).toEqual(fromHome);
	});
});
