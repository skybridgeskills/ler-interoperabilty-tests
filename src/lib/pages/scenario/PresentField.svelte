<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The paste field for a `present-to-verifier` step: the operator's verifier
	 * hands them a fresh request, they paste it here, and the suite presents the
	 * step's credential to it.
	 *
	 * VCALM exchanges are **single-use** (every present needs a fresh interaction
	 * URL), so VCALM callers pass no `canReuse` and get only the paste field.
	 * OID4VP requests **may be reused** across presents, so an OID4 caller passes
	 * `canReuse` (once a prior request exists) and `lastRequest`; the field then
	 * offers a "use the same request" checkbox, and while it is checked the paste
	 * box hides and the present reuses `lastRequest`. On a transport miss the
	 * `note` shows the amber reason and the button reads "Re-present". Purely
	 * presentational — the controller owns the present call and its busy/note/retry
	 * state; ground-truth discipline is the caller's (this names no pass kind).
	 */
	let {
		value = $bindable(''),
		reuse = $bindable(false),
		canReuse = false,
		lastRequest,
		busy = false,
		note,
		retry = false,
		prompt = 'Paste a fresh interaction URL from your verifier',
		placeholder = 'https://your-verifier.example/interactions/…',
		onPresent
	}: {
		/** Bindable freshly-pasted request (used when `reuse` is false). */
		value?: string;
		/** Bindable "use the previous request" choice (OID4VP only). */
		reuse?: boolean;
		/** Whether a previous request is available to reuse. */
		canReuse?: boolean;
		/** The previous request to reuse when `reuse` is checked. */
		lastRequest?: string;
		/** A present is in flight. */
		busy?: boolean;
		/** Transport/retry note surfaced above the button (amber). */
		note?: string;
		/** The button reads "Re-present" instead of "Present" on a retry. */
		retry?: boolean;
		/** Field header copy (VCALM interaction URL vs OID4VP presentation request). */
		prompt?: string;
		/** Textarea placeholder copy. */
		placeholder?: string;
		onPresent?: (request: string) => void;
	} = $props();

	const effective = $derived(reuse && lastRequest ? lastRequest : value.trim());
	const disabled = $derived(busy || effective.length === 0);
</script>

<div class="space-y-3 rounded-md border border-live-border bg-live-soft/40 p-4">
	<p class="text-body-md font-medium text-foreground">{prompt}</p>
	{#if canReuse}
		<label class="flex items-center gap-2 text-body-md text-foreground">
			<input type="checkbox" bind:checked={reuse} class="size-4 shrink-0 accent-live" />
			Use the same request as the last credential
		</label>
	{/if}
	{#if reuse && canReuse}
		<p class="text-body-sm text-muted-foreground">
			Reusing the request from the previous credential.
		</p>
	{:else}
		<textarea
			class="text-body-sm min-h-24 w-full rounded-md border border-border bg-card p-3 font-mono text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
			rows="4"
			bind:value
			disabled={busy}
			{placeholder}
		></textarea>
	{/if}
	{#if note}
		<p class="text-body-sm text-warning">{note}</p>
	{/if}
	<Button
		type="button"
		class="bg-live text-live-foreground hover:bg-live/90"
		{disabled}
		onclick={() => onPresent?.(effective)}
	>
		{busy ? 'Presenting…' : retry ? 'Re-present' : 'Present'}
	</Button>
</div>
