<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { ChecklistRunState } from '$lib/interop/index.js';

	/**
	 * The live run-state badge that sits alongside the role/profile badges on a
	 * runnable page's header. It is driven by the page's own live `runState` — a
	 * transient signal that cannot be derived from the persisted per-requirement
	 * `statuses` map — so it is owned by the page rather than by
	 * {@link RunnableChecklist}, which is otherwise purely statuses-driven.
	 */
	let { runState = 'idle' }: { runState?: ChecklistRunState } = $props();
</script>

{#if runState === 'awaiting-wallet' || runState === 'wallet-connected'}
	<Badge class="border-live-border bg-live-soft text-live">Live · in flight</Badge>
{:else if runState === 'complete'}
	<Badge class="border-success-border bg-success-soft text-success">Run complete</Badge>
{:else if runState === 'error'}
	<Badge variant="destructive">Run failed</Badge>
{/if}
