<script lang="ts">
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import XIcon from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	/**
	 * Opt-in responsive wrapper for a runnable page's right-column content (result card + test
	 * wallet). On `lg` and up it renders its children inline in normal flow — the desktop layout is
	 * unchanged. Below `lg` the same content becomes a live-colored drawer that slides in from the
	 * right edge, reachable via a persistent edge handle, so the wallet is not pushed far down the
	 * stacked mobile page. The children are rendered exactly **once** (a single responsive
	 * container), so their state is not duplicated. Accessible: the handle is an `aria-expanded`
	 * button; Escape and a backdrop tap close it. Live colors via existing tokens only.
	 */
	let {
		handleLabel = 'Test wallet',
		ctaLabel,
		open = $bindable(false),
		children
	}: {
		handleLabel?: string;
		/**
		 * When set (and the drawer is closed on mobile), an inline full-width call-to-action button
		 * opens the drawer — a discoverable in-flow affordance that supplements the always-present
		 * edge handle before a run starts. Pass it only in the idle state; once a run has started,
		 * omit it and the persistent edge handle remains the way back into the drawer.
		 */
		ctaLabel?: string;
		open?: boolean;
		children: Snippet;
	} = $props();

	function close() {
		open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

<!-- Mobile-only inline CTA: the discoverable "start" affordance before a run (idle state). -->
{#if !open && ctaLabel}
	<button
		type="button"
		aria-expanded={open}
		onclick={() => (open = true)}
		class="flex w-full items-center justify-center gap-2 rounded-md border border-live-border bg-live px-4 py-3 text-body-md font-medium text-live-foreground shadow-sm lg:hidden"
	>
		<WalletIcon aria-hidden="true" class="size-4" />
		{ctaLabel}
	</button>
{/if}

<!-- Mobile-only persistent edge handle — shown whenever the drawer is closed (alongside the idle
     CTA, if any); hidden on lg and while the drawer is open. -->
{#if !open}
	<button
		type="button"
		aria-expanded={open}
		aria-label={`Open ${handleLabel}`}
		onclick={() => (open = true)}
		class="fixed top-1/3 right-0 z-40 flex flex-col items-center gap-1.5 rounded-l-md border border-r-0 border-live-border bg-live px-1.5 py-3 text-live-foreground shadow-md lg:hidden"
	>
		<WalletIcon aria-hidden="true" class="size-4" />
		<span class="text-label-md font-medium [writing-mode:vertical-rl]">{handleLabel}</span>
	</button>
{/if}

<!-- Mobile-only backdrop. -->
{#if open}
	<button
		type="button"
		aria-label="Close"
		tabindex="-1"
		onclick={close}
		class="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
	></button>
{/if}

<!--
	The content, rendered once. On lg it is a static block in the right column; below lg it is a
	fixed drawer that slides from the right edge (translated off-screen when closed).
-->
<div
	role="dialog"
	aria-label={handleLabel}
	aria-hidden={!open}
	class={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-live-border bg-background p-4 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:space-y-6 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
		open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
	}`}
>
	<div class="mb-3 flex items-center justify-between lg:hidden">
		<span class="inline-flex items-center gap-2 text-label-md text-live uppercase">
			<WalletIcon aria-hidden="true" class="size-4" />
			{handleLabel}
		</span>
		<button
			type="button"
			aria-label="Close"
			onclick={close}
			class="rounded-md p-1 text-live hover:bg-live/10"
		>
			<XIcon aria-hidden="true" class="size-5" />
		</button>
	</div>
	<div class="space-y-4">
		{@render children()}
	</div>
</div>
