/**
 * The panel is `-mx-4` relative to the bar's wrapper, so the panel's own left edge
 * sits 16px outside the wrapper's. Anything positioned inside the panel against a
 * trigger's x-position carries the correction — the first notch render sat exactly
 * 16px left of its trigger without it.
 */
const PANEL_BLEED_PX = 16;

/**
 * Where the open trigger's centre sits **in the panel's coordinate space**, so the
 * panel can grow out of that trigger and point a notch back at it.
 *
 * Measuring once on open is **not** enough, and the failure is the most common
 * interaction there is: a trigger's label *is* its own summary, so toggling a role
 * inside the open Roles panel rewrites `Roles · Any` → `Roles · Issuers, Wallets`
 * and changes the trigger's width underneath the panel. `getBoundingClientRect()`
 * is not reactive and the element identity never changes, so nothing re-runs.
 *
 * Two mechanisms, because neither covers the other:
 *
 * 1. `track()` is read inside the effect, so **any** summary change re-measures —
 *    including a *sibling's*, which shifts every trigger after it without resizing
 *    the open one.
 * 2. A `ResizeObserver` on the wrapper catches what labels do not: viewport
 *    resizes, and the bar re-wrapping onto another row at narrow widths. It fires
 *    once on observe, so it also covers the initial open.
 *
 * @example
 * ```ts
 * const anchor = anchorX({
 * 	trigger: () => (open ? triggers[open] : undefined),
 * 	wrapper: () => wrapper,
 * 	track: () => dimensions
 * });
 * // anchor.current — px from the panel's left edge
 * ```
 */
export function anchorX(options: {
	/** The open trigger, or `undefined` when nothing is open. */
	trigger: () => HTMLElement | undefined;
	/** The widget the panel is positioned against. */
	wrapper: () => HTMLElement | undefined;
	/** Read for its reactivity only: anything whose change can move the trigger. */
	track: () => unknown;
}): { readonly current: number } {
	let current = $state(0);

	$effect(() => {
		const wrapper = options.wrapper();
		if (!options.trigger() || !wrapper) return;
		// Tracked so a label change re-measures. `$effect` runs after the DOM is
		// updated, so the rect read below is of the new width, not the old one.
		options.track();

		const measure = () => {
			const trigger = options.trigger();
			if (!trigger) return;
			const t = trigger.getBoundingClientRect();
			const w = wrapper.getBoundingClientRect();
			current = t.left - w.left + t.width / 2 + PANEL_BLEED_PX;
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(wrapper);
		return () => observer.disconnect();
	});

	return {
		get current() {
			return current;
		}
	};
}
