import type { Cookies } from '@sveltejs/kit';

import { PERSPECTIVE_COOKIE, PerspectiveCookieValue } from '$lib/interop/perspective/index.js';

/**
 * Read the reader's Perspective cookie on every request, so SSR renders the
 * chosen copy with no flash. Safe on every page: nothing is prerendered.
 */
export function load({ cookies }: { cookies: Cookies }): {
	perspective?: PerspectiveCookieValue;
} {
	const parsed = PerspectiveCookieValue.schema.safeParse(cookies.get(PERSPECTIVE_COOKIE));
	return { perspective: parsed.success ? parsed.data : undefined };
}
