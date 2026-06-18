<script lang="ts" module>
	import type { RunStatus } from '$lib/interop/index.js';

	type ResultConfig = { label: string; class: string };

	const statusConfig: Record<RunStatus, ResultConfig> = {
		passed: {
			label: 'Meets requirements',
			class: 'border-result-pass-border bg-result-pass-soft text-result-pass'
		},
		failed: {
			label: 'Failed',
			class: 'border-result-fail-border bg-result-fail-soft text-result-fail'
		},
		incomplete: {
			label: 'Incomplete',
			class: 'border-result-incomplete-border bg-result-incomplete-soft text-result-incomplete'
		}
	};

	/** Compact absolute date for the run timestamp (deterministic, locale-aware). */
	function formatRanAt(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
	}
</script>

<script lang="ts">
	import type { TestRunRecord } from '$lib/interop/index.js';

	/**
	 * Compact badge for a combination's latest run status. Prop-driven only —
	 * no localStorage access. `record` undefined renders "no runs yet".
	 */
	let { record, showTime = true }: { record?: TestRunRecord; showTime?: boolean } = $props();

	const cfg = $derived(record ? statusConfig[record.status] : undefined);
	const when = $derived(record && showTime ? formatRanAt(record.ranAt) : '');
</script>

{#if record && cfg}
	<span
		class={`inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-4xl border px-2 text-xs font-medium ${cfg.class}`}
	>
		{cfg.label}
		{#if when}
			<time class="opacity-70" datetime={record.ranAt}>{when}</time>
		{/if}
	</span>
{:else}
	<span
		class="inline-flex h-5 w-fit shrink-0 items-center rounded-4xl border border-border px-2 text-xs font-medium text-muted-foreground"
	>
		No runs yet
	</span>
{/if}
