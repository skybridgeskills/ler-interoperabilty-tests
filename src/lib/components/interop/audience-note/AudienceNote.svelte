<script lang="ts">
	/**
	 * Reusable dual-audience explainer: one line for builders, one for
	 * evaluators. Purely presentational — no logic.
	 */
	let {
		builder,
		evaluator,
		title
	}: {
		builder: string;
		evaluator: string;
		title?: string;
	} = $props();
</script>

<div class="space-y-2 rounded-md border border-border bg-muted/40 p-3">
	{#if title}
		<p class="text-label-md text-muted-foreground">{title}</p>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1">
			<p class="text-label-md text-muted-foreground">For builders</p>
			<p class="text-body-md text-muted-foreground">{builder}</p>
		</div>
		<div class="space-y-1">
			<p class="text-label-md text-muted-foreground">For evaluators</p>
			<p class="text-body-md text-muted-foreground">{evaluator}</p>
		</div>
	</div>
</div>
