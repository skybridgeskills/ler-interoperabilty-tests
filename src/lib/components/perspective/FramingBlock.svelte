<script lang="ts">
	import type { Perspective } from '$lib/interop/perspective/index.js';

	import { perspectiveOption } from './perspective-options.js';

	/**
	 * A scenario's framing paragraph for the reader's Perspective: how to approach
	 * this scenario when building a product vs. watching a vendor demonstrate one.
	 * Rendered once, directly under the scenario hero — never per step, never
	 * collapsible. The caller resolves the text and renders nothing when the
	 * Perspective is unset or the scenario has no framing.
	 *
	 * Orchid, because it is Perspective copy: visibly distinct from the blue setup
	 * callout inside each step card.
	 */
	let { perspective, text }: { perspective: Perspective; text: string } = $props();

	const option = $derived(perspectiveOption(perspective));
</script>

<aside
	class="space-y-1.5 rounded-md border-l-4 border-perspective-border bg-perspective-soft p-4"
	aria-label={`${option.noun} framing`}
>
	<p class="inline-flex items-center gap-1.5 text-label-md text-perspective">
		<option.icon class="size-3.5" aria-hidden="true" />
		{option.noun}
	</p>
	<p class="text-body-md text-foreground">{text}</p>
</aside>
