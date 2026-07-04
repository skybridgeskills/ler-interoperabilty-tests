<script lang="ts">
	import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import type { Snippet } from 'svelte';

	import { RunStatusIndicator } from '$lib/components/interop/run-status-indicator/index.js';

	import type { WalletActivityEntry } from '../test-wallet-types.js';

	import { walletActivityStatusView } from './activity-status-view.js';

	/**
	 * Ordered wallet activity/messages list. Each row leads with a neutral kind icon
	 * (interaction vs check) and trails with a {@link RunStatusIndicator} — the same
	 * shared status language as the checklist, so results read as one system. Before the
	 * first run it renders the `emptyActivity` snippet, or a quiet fallback line.
	 */
	let {
		activity = [],
		emptyActivity
	}: { activity?: WalletActivityEntry[]; emptyActivity?: Snippet } = $props();
</script>

{#if activity.length > 0}
	<ol class="space-y-2">
		{#each activity as entry (entry.id)}
			<li class="flex items-start gap-2.5">
				{#if entry.kind === 'check'}
					<ShieldCheckIcon
						aria-hidden="true"
						class="mt-0.5 size-4 shrink-0 text-muted-foreground"
					/>
				{:else}
					<ArrowLeftRightIcon
						aria-hidden="true"
						class="mt-0.5 size-4 shrink-0 text-muted-foreground"
					/>
				{/if}
				<div class="min-w-0 flex-1 space-y-0.5">
					<p class="text-body-md text-foreground">{entry.label}</p>
					{#if entry.detail}
						<p class="text-label-md break-words text-muted-foreground">{entry.detail}</p>
					{/if}
				</div>
				<div class="shrink-0 pt-0.5">
					<RunStatusIndicator status={walletActivityStatusView(entry.status)} />
				</div>
			</li>
		{/each}
	</ol>
{:else if emptyActivity}
	{@render emptyActivity()}
{:else}
	<p class="text-body-md text-muted-foreground">No activity yet.</p>
{/if}
