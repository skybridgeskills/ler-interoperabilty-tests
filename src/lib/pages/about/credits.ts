import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * An organisation credited on the About page. Data, not markup, so a funder
 * whose logo is approved later slots in as one more row without rework.
 */
export const Credit = ZodFactory(
	z.object({
		name: z.string().min(1),
		url: z.string().url(),
		/** What it did: "Development", "Product development". */
		role: z.string().min(1),
		/**
		 * Path under `/credits/`, served from `static/credits/`. Set only once the
		 * file exists; without it the row is name and role only.
		 */
		logo: z.string().startsWith('/credits/').optional()
	})
);
export type Credit = ReturnType<typeof Credit>;

/** The organisations that built the suite, in display order. */
export const builtBy: Credit[] = [
	Credit({
		name: 'Digital Credentials Commons',
		url: 'https://dccommons.org/',
		role: 'Development · the tool’s home'
	}),
	// The bare domain: `www.skybridgeskills.com` 404s.
	Credit({ name: 'Skybridge Skills', url: 'https://skybridgeskills.com/', role: 'Development' }),
	Credit({
		name: 'Micro-credential Multiverse',
		url: 'https://www.microcredentialmultiverse.com/',
		role: 'Product development'
	})
];
