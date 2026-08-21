<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The paste field for a `receive-from-issuer` step: the operator's issuer
	 * produces a credential, and they hand it — or the URL that leads to it — to
	 * the suite here.
	 *
	 * One field with per-transport copy, because the operator's run-time input
	 * differs only in what they paste: a credential JSON (`direct`), a fresh
	 * VC-API interaction URL (`vcalm`), an `openid-credential-offer://` URL
	 * (`oid4vci`). There is deliberately **no reuse toggle** — every intake is a
	 * fresh engagement, and a reused offer or exchange is single-use anyway. On a
	 * delivery miss the `note` shows the amber reason and the button reads "Try
	 * again". Purely presentational: the controller owns the receive call and its
	 * busy/note/retry state.
	 */
	let {
		value = $bindable(''),
		busy = false,
		note,
		retry = false,
		prompt = 'Paste the credential your issuer produced',
		placeholder = '{ "@context": […], "type": ["VerifiableCredential", "OpenBadgeCredential"], … }',
		onReceive
	}: {
		/** Bindable operator input for this intake. */
		value?: string;
		/** A receive is in flight. */
		busy?: boolean;
		/** Delivery/retry note surfaced above the button (amber). */
		note?: string;
		/** The button reads "Try again" instead of "Receive" on a retry. */
		retry?: boolean;
		/** Field header copy (a pasted credential vs an interaction URL vs an offer URL). */
		prompt?: string;
		/** Textarea placeholder copy. */
		placeholder?: string;
		onReceive?: (input: string) => void;
	} = $props();

	const effective = $derived(value.trim());
	const disabled = $derived(busy || effective.length === 0);
</script>

<div class="space-y-3 rounded-md border border-live-border bg-live-soft/40 p-4">
	<p class="text-body-md font-medium text-foreground">{prompt}</p>
	<textarea
		class="text-body-sm min-h-24 w-full rounded-md border border-border bg-card p-3 font-mono text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
		rows="4"
		bind:value
		disabled={busy}
		{placeholder}
	></textarea>
	{#if note}
		<p class="text-body-sm text-warning">{note}</p>
	{/if}
	<Button
		type="button"
		class="bg-live text-live-foreground hover:bg-live/90"
		{disabled}
		onclick={() => onReceive?.(effective)}
	>
		{busy ? 'Receiving…' : retry ? 'Try again' : 'Receive'}
	</Button>
</div>
