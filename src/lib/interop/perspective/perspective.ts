import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * How the reader is using the suite: **building** a product, or **evaluating**
 * one. A stance of the person reading, never a product role — "role" is
 * issuer / wallet / verifier. It changes copy only; nothing is gated on it.
 *
 * "Unset" is `undefined`, not a third Perspective: an unset reader sees the
 * neutral page.
 */
export const Perspective = ZodFactory(z.enum(['builder', 'evaluator']));
export type Perspective = ReturnType<typeof Perspective>;

/**
 * Copy that reads differently to a Builder and an Evaluator. Both versions are
 * required whenever a string varies; neither falls back to the other. `neutral`
 * is what an unset Perspective sees — omit it for copy that must be ABSENT when
 * unset (scenario framing, choice-card example lines); include it for UI
 * strings, which always render.
 */
export const PerspectiveCopy = ZodFactory(
	z.object({
		builder: z.string().min(1),
		evaluator: z.string().min(1),
		neutral: z.string().min(1).optional()
	})
);
export type PerspectiveCopy = ReturnType<typeof PerspectiveCopy>;

/**
 * Resolve copy for a reader: a chosen Perspective gets its own version; an
 * unset one gets `neutral`, or `undefined` — which means render nothing.
 */
export function perspectiveCopy(
	copy: PerspectiveCopy,
	perspective: Perspective | undefined
): string | undefined {
	return perspective ? copy[perspective] : copy.neutral;
}

/**
 * The first-party cookie that remembers the reader's choice. A cookie rather
 * than localStorage because the root layout reads it on every request, so SSR
 * renders the chosen copy with no flash. It is never put in a URL.
 */
export const PERSPECTIVE_COOKIE = 'lits.perspective';

/** One year, in seconds. */
export const PERSPECTIVE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * What the cookie may hold: a chosen Perspective, or `dismissed` — the reader
 * said "Not now" to the first-visit gate, so the page stays neutral and the gate
 * does not return. `dismissed` exists only here, never as a Perspective.
 */
export const PerspectiveCookieValue = ZodFactory(z.enum(['builder', 'evaluator', 'dismissed']));
export type PerspectiveCookieValue = ReturnType<typeof PerspectiveCookieValue>;
