<script lang="ts">
	import WalletIcon from '@lucide/svelte/icons/wallet';

	import type { TestWalletState } from '../test-wallet-types.js';

	/**
	 * Wallet identity + a small lifecycle chip (idle / live / ready / error). Reuses the
	 * `live` / `success` / `muted` / `destructive` tokens — no page-level "Run complete"
	 * badge is re-implemented here (that verdict lives outside the box in P3's result card).
	 */
	let {
		walletName = 'Test wallet',
		state = 'idle'
	}: { walletName?: string; state?: TestWalletState } = $props();

	const chip = $derived(
		(
			{
				idle: { label: 'Idle', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
				running: { label: 'Live', dot: 'bg-live animate-pulse', text: 'text-live' },
				done: { label: 'Ready', dot: 'bg-success', text: 'text-success' },
				error: { label: 'Error', dot: 'bg-destructive', text: 'text-destructive' }
			} as const
		)[state]
	);
</script>

<header class="flex items-center justify-between gap-3">
	<span class="inline-flex items-center gap-2">
		<WalletIcon aria-hidden="true" class="size-4 text-live" />
		<span class="text-label-md text-live uppercase">{walletName}</span>
	</span>
	<span class={`inline-flex items-center gap-1.5 text-label-md ${chip.text}`}>
		<span aria-hidden="true" class={`size-2 shrink-0 rounded-full ${chip.dot}`}></span>
		<span class="font-medium">{chip.label}</span>
	</span>
</header>
