<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The paste field for a `present-to-verifier` step: the operator's verifier
	 * hands them a fresh VC-API interaction URL, they paste it here, and the suite
	 * presents the step's credential to it.
	 *
	 * VCALM exchanges are **single-use**, so there is no "reuse the last request"
	 * toggle (unlike the OID4VP field): every present needs a fresh URL. On a
	 * transport miss the `note` shows the amber reason and the button reads
	 * "Re-present". Purely presentational — the controller owns the present call
	 * and its busy/note/retry state; ground-truth discipline is the caller's (this
	 * names no pass kind).
	 */
	let {
		value = $bindable(''),
		busy = false,
		note,
		retry = false,
		onPresent
	}: {
		/** Bindable freshly-pasted interaction URL. */
		value?: string;
		/** A present is in flight. */
		busy?: boolean;
		/** Transport/retry note surfaced above the button (amber). */
		note?: string;
		/** The button reads "Re-present" instead of "Present" on a retry. */
		retry?: boolean;
		onPresent?: (interactionUrl: string) => void;
	} = $props();

	const disabled = $derived(busy || value.trim().length === 0);
</script>

<div class="space-y-3 rounded-md border border-live-border bg-live-soft/40 p-4">
	<p class="text-body-md font-medium text-foreground">
		Paste a fresh interaction URL from your verifier
	</p>
	<textarea
		class="text-body-sm min-h-24 w-full rounded-md border border-border bg-card p-3 font-mono text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
		rows="4"
		bind:value
		disabled={busy}
		placeholder="https://your-verifier.example/interactions/…"
	></textarea>
	{#if note}
		<p class="text-body-sm text-warning">{note}</p>
	{/if}
	<Button
		type="button"
		class="bg-live text-live-foreground hover:bg-live/90"
		{disabled}
		onclick={() => onPresent?.(value.trim())}
	>
		{busy ? 'Presenting…' : retry ? 'Re-present' : 'Present'}
	</Button>
</div>
