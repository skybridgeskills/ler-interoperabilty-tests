<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The per-credential presentation-request field shown inside the wallet's
	 * prompt area for credentials 2–4 (and on a transport retry). Verifiers that
	 * one-time their requests need a fresh one each time; those that permit reuse
	 * get a "use the same request" convenience checked by default. Purely
	 * presentational — the page owns the request state and the present call.
	 */
	let {
		credentialNumber,
		value = $bindable(''),
		reuse = $bindable(false),
		canReuse = false,
		busy = false,
		note,
		retry = false,
		onPresent
	}: {
		credentialNumber: number;
		/** Bindable freshly-pasted request (used when `reuse` is false). */
		value?: string;
		/** Bindable "use the previous request" choice. */
		reuse?: boolean;
		/** Whether a previous request is available to reuse. */
		canReuse?: boolean;
		busy?: boolean;
		/** Transport/retry note surfaced above the button (amber). */
		note?: string;
		/** Button reads "Re-present" instead of "Present" on a retry. */
		retry?: boolean;
		onPresent?: () => void;
	} = $props();

	const disabled = $derived(busy || (!reuse && value.trim().length === 0));
</script>

<div class="space-y-3">
	<p class="text-label-md text-muted-foreground uppercase">Credential {credentialNumber}</p>
	<p class="text-body-md font-medium text-foreground">
		Paste a fresh presentation request from your verifier
	</p>
	{#if canReuse}
		<label class="flex items-center gap-2 text-body-md text-foreground">
			<input type="checkbox" bind:checked={reuse} class="size-4 shrink-0 accent-live" />
			Use the same request as the last credential
		</label>
	{/if}
	{#if reuse}
		<p class="text-body-sm text-muted-foreground">
			Reusing the request from the previous credential.
		</p>
	{:else}
		<textarea
			class="text-body-sm min-h-32 w-full rounded-md border border-border bg-card p-3 font-mono text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
			rows="6"
			bind:value
			disabled={busy}
			placeholder="openid4vp://… (or a request_uri URL or the request JSON)"
		></textarea>
	{/if}
	{#if note}
		<p class="text-body-sm text-warning">{note}</p>
	{/if}
	<Button
		type="button"
		class="bg-live text-live-foreground hover:bg-live/90"
		{disabled}
		onclick={() => onPresent?.()}
	>
		{retry ? 'Re-present' : 'Present'} credential {credentialNumber}
	</Button>
</div>
