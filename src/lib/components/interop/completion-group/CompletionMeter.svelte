<script lang="ts">
	/**
	 * A thin horizontal progress bar for a completion set, with a `met/total`
	 * label beside it.
	 *
	 * Purely presentational. It takes `met`/`total` already computed by M4's
	 * `evaluateCompletion` and turns them into a fill width — display geometry, not
	 * meter arithmetic. It never re-derives `met === total`; the caller shares the
	 * same `result` with `isClaimable`, so the fill and the claim affordance agree.
	 *
	 * Full (`met === total`, non-empty) fills green (`result-pass`) — finished
	 * success. Partial fills warm (`progress`/`live`) — in-flight. Empty shows the
	 * track only.
	 */
	let { met, total }: { met: number; total: number } = $props();

	const pct = $derived(total > 0 ? Math.min(100, Math.max(0, (met / total) * 100)) : 0);
	const full = $derived(total > 0 && met === total);
	const fillClass = $derived(full ? 'bg-result-pass' : 'bg-progress');
</script>

<div class="flex items-center gap-3">
	<div
		class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"
		role="progressbar"
		aria-valuenow={met}
		aria-valuemin={0}
		aria-valuemax={total}
		aria-label={`${met} of ${total} requirements met`}
	>
		{#if pct > 0}
			<div class={`h-full rounded-full ${fillClass}`} style={`width: ${pct}%`}></div>
		{/if}
	</div>
	<span class="shrink-0 text-label-md whitespace-nowrap text-muted-foreground">
		{met}/{total} requirements
	</span>
</div>
