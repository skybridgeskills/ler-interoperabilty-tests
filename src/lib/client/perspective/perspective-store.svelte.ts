import {
	type Perspective,
	PERSPECTIVE_COOKIE,
	PERSPECTIVE_COOKIE_MAX_AGE,
	type PerspectiveCookieValue
} from '$lib/interop/perspective/index.js';

/**
 * The reader's Perspective, seeded from the `lits.perspective` cookie the root
 * layout read for this request, and written back on every change.
 *
 * **Not a singleton.** On the server the store is per request, so the layout
 * creates one and provides it through context (`setPerspectiveStore`); a
 * module-scope instance would leak one reader's choice into another's render.
 */
export function createPerspectiveStore(initial: PerspectiveCookieValue | undefined) {
	let value = $state(initial);

	return {
		/** The chosen Perspective, or `undefined` when unset or dismissed. */
		get current(): Perspective | undefined {
			return value === 'builder' || value === 'evaluator' ? value : undefined;
		},
		/** True only before any choice or dismissal — what the first-visit gate keys on. */
		get undecided(): boolean {
			return value === undefined;
		},
		choose(perspective: Perspective): void {
			value = perspective;
			writeCookie(perspective);
		},
		dismiss(): void {
			value = 'dismissed';
			writeCookie('dismissed');
		}
	};
}

export type PerspectiveStore = ReturnType<typeof createPerspectiveStore>;

/** First-party, readable by script (not `HttpOnly`), `Secure` only on https. */
function writeCookie(value: PerspectiveCookieValue): void {
	if (typeof document === 'undefined') return;
	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${PERSPECTIVE_COOKIE}=${value}; Max-Age=${PERSPECTIVE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}
