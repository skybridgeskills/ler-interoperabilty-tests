import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { allCombinations } from './accessors.js';
import { liveRouteFor } from './run-routes.js';

const combinations = allCombinations();

// Repo root: this file lives at src/lib/interop/, so routes are three dirs up.
const routesDir = path.join(fileURLToPath(new URL('.', import.meta.url)), '../../routes');

describe('liveRouteFor', () => {
	it('maps a couple of known combinations to their canonical live routes', () => {
		expect(liveRouteFor('wallet', 'credential-acceptance', 'vcalm')).toBe(
			'/wallet/credential-acceptance/vcalm'
		);
		expect(liveRouteFor('issuer', 'direct-credential-issuance', 'ob3-direct-delivery')).toBe(
			'/issuer/direct-credential-issuance/ob3-direct-delivery'
		);
		expect(liveRouteFor('verifier', 'direct-credential-verification', 'ob3-direct-delivery')).toBe(
			'/verifier/direct-credential-verification/ob3-direct-delivery'
		);
	});

	it('covers every supported combination with a non-empty absolute path', () => {
		for (const { role, workflow, profile } of combinations) {
			const route = liveRouteFor(role, workflow, profile);
			expect(route, `${role}/${workflow}/${profile}`).toBe(`/${role}/${workflow}/${profile}`);
		}
	});

	// A mapping that resolves to a URL with no concrete runnable route behind it
	// would 404 (or silently fall through to the static checklist). Assert each
	// combination is backed by a real `+page.svelte` on disk so a missing live
	// route fails here rather than at click time.
	it('resolves every combination to a concrete runnable route on disk', () => {
		for (const { role, workflow, profile } of combinations) {
			const route = liveRouteFor(role, workflow, profile);
			const pageFile = path.join(routesDir, route, '+page.svelte');
			expect(existsSync(pageFile), `missing runnable route for ${route} (${pageFile})`).toBe(true);
		}
	});
});
