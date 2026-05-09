<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Viewport width; container queries (`@lg:` etc.) resolve against this box. */
		width?: number;
		/** Fill available space while guaranteeing min-width for container queries. */
		fluid?: boolean;
		/** Banner label; defaults to `Preview ({width}px)` or `Preview (≥{width}px)`. */
		label?: string;
		children: Snippet;
	}

	let { width = 375, fluid = false, label, children }: Props = $props();

	const banner = $derived(label ?? (fluid ? `Preview (≥${width}px)` : `Preview (${width}px)`));
</script>

<!--
  Fixed-width wrapper with `@container` so components using container queries
  behave predictably in Storybook. When `fluid` is true, the container fills
  available space with a guaranteed min-width.
-->
<div
	class="@container box-content overflow-x-auto rounded border-2 border-border bg-background"
	style:width={fluid ? '100%' : `${width}px`}
	style:min-width={fluid ? `${width}px` : undefined}
	style:max-width={fluid ? undefined : `min(100%, ${width}px)`}
>
	<div class="bg-muted px-2 py-1 text-xs font-medium text-foreground">{banner}</div>
	<div class="p-2">
		{@render children()}
	</div>
</div>
