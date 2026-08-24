import { describe, expect, it } from 'vitest';

import { badgeBySlug, badgeFingerprint } from '$lib/interop/badges/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { load } from './+page.server.js';

function withCtx<T>(fn: () => T): Promise<T> {
	return buildAppContext({ CONTEXT: 'test' }).then((ctx) => runInContext(ctx, fn));
}

const call = (slug: string, query = '') =>
	load({ params: { slug }, url: new URL(`http://localhost/badges/${slug}${query}`) });

describe('GET /badges/[slug] load', { timeout: 20_000 }, () => {
	it('404s an unknown badge slug', async () => {
		await withCtx(() => {
			try {
				call('no-such-badge');
				throw new Error('expected a 404');
			} catch (e) {
				expect((e as { status?: number }).status).toBe(404);
			}
		});
	});

	it('serves the stranger view: definition ids and no version mismatch without ?v=', async () => {
		await withCtx(() => {
			const data = call('oid4-wallet-essential');
			expect(data.badge.slug).toBe('oid4-wallet-essential');
			expect(data.achievementId).toBe('http://localhost:5173/badges/oid4-wallet-essential');
			expect(data.criteriaId).toContain('?v=');
			expect(data.versionMismatch).toBe(false);
			expect(data.blocked).toEqual({});
		});
	});

	it('does not flag a mismatch when ?v= equals the current fingerprint', async () => {
		await withCtx(() => {
			const fp = badgeFingerprint(badgeBySlug('oid4-wallet-essential')!);
			expect(call('oid4-wallet-essential', `?v=${fp}`).versionMismatch).toBe(false);
		});
	});

	it('flags a mismatch for a stale ?v=', async () => {
		await withCtx(() => {
			expect(call('oid4-wallet-essential', '?v=stale0000').versionMismatch).toBe(true);
		});
	});
});
