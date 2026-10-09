/**
 * `new Date().toISOString()`, in a plain `.ts` module.
 *
 * The engine wants `now` injected rather than read ambiently (it is
 * deterministic by design), so the controller needs a one-shot timestamp. A
 * bare `new Date()` inside a `.svelte.ts` file trips
 * `svelte/prefer-svelte-reactivity`, which cannot tell a momentary read from a
 * stored one — so the read lives here instead of getting a `SvelteDate` it has
 * no use for.
 */
export function nowIso(): string {
	return new Date().toISOString();
}
