<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import type { PassVerdict, RejectionReason } from '$lib/interop/verifier-run/index.js';
	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';

	import type { TestWalletState } from '../test-wallet-types.js';
	import TestWallet from '../TestWallet.svelte';

	import type { PassArtifactView } from './pass-artifact-card/pass-artifact-view.js';
	import PassArtifactCard from './pass-artifact-card/PassArtifactCard.svelte';

	/**
	 * Verifier acceptance-passes variant of {@link TestWallet}: the wallet is the
	 * interlocutor the operator converses with. Each pass credential lands in the
	 * artifact list (copy/download via {@link PassArtifactCard}); the wallet then
	 * asks INSIDE its surface, via the base `prompt` slot, what the operator's
	 * verifier decided (Accepted / Rejected + optional reason, one confirm per
	 * pass — no editing past verdicts; reset restarts the run).
	 *
	 * Two shapes share this variant. Direct delivery (M1): no initiation input,
	 * one action button starts the passes. OID4VP (M2): an initiation input takes
	 * the operator's presentation request, and a page-provided `requestField`
	 * snippet collects a fresh request per credential; `showVerdict` gates the
	 * verdict question so the request step can precede it. Purely presentational:
	 * the page owns run state and the bindable selections.
	 */
	let {
		state = 'idle',
		busy = false,
		canRun = true,
		activity = [],
		artifacts = [],
		passArtifacts = [],
		currentPassNumber,
		totalPasses,
		inputLabel,
		inputPlaceholder,
		multiline = false,
		value = $bindable(''),
		actionLabel = 'Start verifying',
		runningLabel = 'Verifying in progress',
		requestField,
		showVerdict = true,
		verdict = $bindable(undefined),
		reason = $bindable(''),
		onStart,
		onConfirm,
		onReset
	}: {
		state?: TestWalletState;
		busy?: boolean;
		canRun?: boolean;
		activity?: WalletActivity[];
		/** Pass-through artifacts for the base list (unused by the verifier page, which renders `passArtifacts`). */
		artifacts?: WalletArtifact[];
		/** The acceptance-pass credentials, rendered as copy/download artifact cards. */
		passArtifacts?: PassArtifactView[];
		/** 1-based number of the pass awaiting a verdict; `undefined` hides the question. */
		currentPassNumber?: number;
		totalPasses?: number;
		/** Idle initiation input label (OID4VP presentation request); omit for the input-less M1 flow. */
		inputLabel?: string;
		inputPlaceholder?: string;
		multiline?: boolean;
		/** Bindable initiation-input value (the pasted presentation request). */
		value?: string;
		actionLabel?: string;
		runningLabel?: string;
		/** Page-provided request field rendered above the verdict question (OID4VP per-credential request / retry). */
		requestField?: Snippet;
		/** Whether to show the verdict question; false while a credential still needs a request. */
		showVerdict?: boolean;
		/** Bindable verdict selection for the current pass. */
		verdict?: PassVerdict | undefined;
		/** Bindable rejection reason for the current pass (`''` = no reason given). */
		reason?: RejectionReason | '';
		onStart?: () => void | Promise<void>;
		/** Confirm the current pass's verdict — the wallet advances to the next pass. */
		onConfirm?: () => void;
		onReset?: () => void;
	} = $props();

	const confirmDisabled = $derived(verdict === undefined);
	const verdictVisible = $derived(showVerdict && currentPassNumber !== undefined);
	const promptVisible = $derived(requestField !== undefined || verdictVisible);
</script>

{#snippet intro()}
	The test wallet hands your verifier a short series of credentials — some good, some deliberately
	defective, in a randomized order. Deliver each one to your verifier, then tell the wallet what it
	decided. Ground truth is revealed after the last verdict.
{/snippet}

{#snippet emptyActivity()}
	<p class="text-body-md text-muted-foreground">
		Nothing yet — start verifying and the wallet will narrate each hand-off here.
	</p>
{/snippet}

{#snippet passCards()}
	{#each passArtifacts as pass (pass.fileName)}
		<PassArtifactCard {pass} />
	{/each}
{/snippet}

<!-- Mid-run escape hatch: verdicts cannot be edited in v1, so the only way to correct a
     mistake is to abandon the run and start fresh. -->
{#snippet startOver()}
	{#if state === 'running'}
		<Button type="button" variant="outline" onclick={() => onReset?.()}>Start over</Button>
	{/if}
{/snippet}

{#snippet prompt()}
	<div class="space-y-4">
		{#if requestField}
			{@render requestField()}
		{/if}
		{#if verdictVisible}
			<div class="space-y-3">
				<p class="text-label-md text-muted-foreground uppercase">
					Credential {currentPassNumber}{#if totalPasses}&nbsp;of {totalPasses}{/if}
				</p>
				<fieldset>
					<legend class="text-body-md font-medium text-foreground">
						Did your verifier accept this credential?
					</legend>
					<div class="mt-3 space-y-2">
						<label class="flex items-center gap-2 text-body-md text-foreground">
							<input
								type="radio"
								name="verifier-verdict"
								value="accepted"
								checked={verdict === 'accepted'}
								onchange={() => (verdict = 'accepted')}
								class="size-4 shrink-0 accent-live"
							/>
							Accepted
						</label>
						<label class="flex items-center gap-2 text-body-md text-foreground">
							<input
								type="radio"
								name="verifier-verdict"
								value="rejected"
								checked={verdict === 'rejected'}
								onchange={() => (verdict = 'rejected')}
								class="size-4 shrink-0 accent-live"
							/>
							Rejected
						</label>
					</div>
				</fieldset>
				{#if verdict === 'rejected'}
					<label class="block space-y-1">
						<span class="text-label-md text-muted-foreground">Rejection reason (optional)</span>
						<select
							bind:value={reason}
							class="h-9 w-full rounded-md border border-border bg-card px-3 text-body-md text-foreground"
						>
							<option value="">Not specified</option>
							<option value="signature">Signature problem</option>
							<option value="schema">Schema problem</option>
							<option value="expiry">Expired</option>
							<option value="other">Other</option>
						</select>
					</label>
				{/if}
				<Button
					type="button"
					class="bg-live text-live-foreground hover:bg-live/90"
					disabled={confirmDisabled}
					onclick={() => onConfirm?.()}
				>
					Record verdict
				</Button>
			</div>
		{/if}
	</div>
{/snippet}

<TestWallet
	walletName="Test wallet"
	{inputLabel}
	{inputPlaceholder}
	{multiline}
	bind:value
	{actionLabel}
	{runningLabel}
	againLabel="Start over"
	{state}
	{busy}
	{canRun}
	{activity}
	{artifacts}
	{intro}
	{emptyActivity}
	secondaryActions={startOver}
	artifactsExtra={passArtifacts.length > 0 ? passCards : undefined}
	prompt={promptVisible ? prompt : undefined}
	onRun={onStart}
	{onReset}
/>
