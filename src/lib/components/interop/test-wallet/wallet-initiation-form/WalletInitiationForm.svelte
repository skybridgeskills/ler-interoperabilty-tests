<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	import type { TestWalletState } from '../test-wallet-types.js';

	/**
	 * The wallet's primary affordance: a semantically-labelled initiation input + a submit
	 * button carrying a semantic action label. Owns the `<form onsubmit>` and the bindable
	 * `value`; emits `onRun`. All copy is passed in so no protocol wording lives here.
	 *
	 * Set `multiline` to render a `<textarea>` instead of the single-line `<input>` (the
	 * paste variant delivers a whole credential JSON document). `secondaryActions` renders
	 * extra buttons in the action row (e.g. the paste variant's "Load sample").
	 */
	let {
		inputLabel,
		inputPlaceholder,
		inputType = 'text',
		multiline = false,
		value = $bindable(''),
		actionLabel,
		runningLabel,
		againLabel,
		state = 'idle',
		busy = false,
		canRun = true,
		secondaryActions,
		onRun,
		onReset
	}: {
		inputLabel: string;
		inputPlaceholder?: string;
		inputType?: 'url' | 'text';
		multiline?: boolean;
		value?: string;
		actionLabel: string;
		runningLabel?: string;
		againLabel?: string;
		state?: TestWalletState;
		busy?: boolean;
		canRun?: boolean;
		secondaryActions?: Snippet;
		onRun?: () => void | Promise<void>;
		onReset?: () => void;
	} = $props();

	const submitLabel = $derived(
		busy
			? (runningLabel ?? actionLabel)
			: state === 'done'
				? (againLabel ?? actionLabel)
				: actionLabel
	);
	const disabled = $derived(busy || !canRun || value.trim().length === 0);
	const showReset = $derived(state === 'done' || state === 'error');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (disabled) return;
		void onRun?.();
	}
</script>

<form class="space-y-3" onsubmit={handleSubmit}>
	<label class="block space-y-1">
		<span class="text-label-md text-foreground">{inputLabel}</span>
		{#if multiline}
			<textarea
				class="text-body-sm min-h-40 w-full rounded-md border border-border bg-card p-3 font-mono text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
				rows="8"
				bind:value
				disabled={busy}
				placeholder={inputPlaceholder}
			></textarea>
		{:else}
			<Input
				type={inputType}
				bind:value
				disabled={busy}
				placeholder={inputPlaceholder}
				autocomplete="off"
			/>
		{/if}
	</label>
	<div class="flex flex-wrap gap-2">
		<Button type="submit" class="bg-live text-live-foreground hover:bg-live/90" {disabled}>
			{submitLabel}
		</Button>
		{#if secondaryActions}
			{@render secondaryActions()}
		{/if}
		{#if showReset}
			<Button type="button" variant="outline" onclick={() => onReset?.()} disabled={busy}>
				Reset
			</Button>
		{/if}
	</div>
</form>
