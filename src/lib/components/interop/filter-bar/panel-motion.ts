/**
 * The filter panel's entrance.
 *
 * **Entry only, and deliberately so.** A dismissal should feel immediate, so the
 * panel is simply unmounted. There is also a hard reason not to add an exit: an
 * `out:` transition keeps the node mounted until the animation finishes, the focus
 * spec polls for that node's *absence* seven times, and animation frames stall
 * outright when the page is not being rendered — a backgrounded tab froze the panel
 * at its first frame indefinitely during design. Do not add one.
 *
 * @example
 * ```svelte
 * const { reveal, fade } = panelMotion(() => anchor.current);
 * <div in:reveal>…</div>
 * ```
 */
export function panelMotion(anchorX: () => number) {
	/**
	 * Reduced motion is a hard stop. A JS transition cannot be disabled by a media
	 * query alone, so the query is read here; `ThemeToggle.svelte` is the repo's only
	 * other honouring of it.
	 */
	const reduced = () =>
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	return {
		/**
		 * A fade, a 10px drop and a 2% scale, growing from the open trigger's own
		 * x-position so the panel reads as unfolding out of the button that opened it.
		 */
		reveal(_node: Element) {
			if (reduced()) return { duration: 0 };
			return {
				duration: 190,
				easing: (t: number) => 1 - Math.pow(1 - t, 3),
				css: (t: number, u: number) =>
					`opacity: ${t};
					 transform-origin: ${anchorX()}px top;
					 transform: translateY(${-10 * u}px) scale(${1 - 0.02 * u});`
			};
		},

		/** The backdrop's cross-fade. */
		fade(_node: Element) {
			if (reduced()) return { duration: 0 };
			return { duration: 150, css: (t: number) => `opacity: ${t}` };
		}
	};
}
