<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import type { AttestedAnswerValue } from '$lib/interop/scenario-run/index.js';
	import type { AttestedAnswer } from '$lib/interop/scenarios/index.js';

	/**
	 * The options an attested requirement offers, plus `can't tell`.
	 *
	 * Full-width and generously tappable on purpose: this is driven with a thumb
	 * while the other hand holds a wallet.
	 *
	 * **`can't tell` is appended here, on every attested requirement, always.** It
	 * is never authored and can never be authored away — "my wallet gave me
	 * nothing to judge by" is the failure mode the suite most wants to hear
	 * about, and a scenario author must not be able to suppress it. It is set
	 * apart visually so it does not read as one more peer option.
	 *
	 * Stores nothing. The answer goes straight out through {@link onAnswer}.
	 */
	let {
		answer,
		onAnswer,
		disabled = false
	}: {
		answer: AttestedAnswer;
		onAnswer: (value: AttestedAnswerValue) => void;
		disabled?: boolean;
	} = $props();

	/**
	 * An `affirm` question's two options. Authored so `true` is always the
	 * expected answer, so these are the statement's yes/no rather than the
	 * literal words "true" and "false".
	 */
	const AFFIRM = [
		{ value: true, label: 'Yes' },
		{ value: false, label: 'No' }
	];
</script>

<div class="space-y-2">
	<div class="flex flex-col gap-2">
		{#if answer.kind === 'affirm'}
			{#each AFFIRM as option (option.label)}
				<Button
					type="button"
					variant="outline"
					{disabled}
					class="h-auto justify-start py-2 text-left"
					onclick={() => onAnswer({ kind: 'affirm', value: option.value })}
				>
					{option.label}
				</Button>
			{/each}
		{:else}
			{#each answer.options as option (option.value)}
				<Button
					type="button"
					variant="outline"
					{disabled}
					class="h-auto justify-start py-2 text-left"
					onclick={() => onAnswer({ kind: 'choose', value: option.value })}
				>
					{option.label}
				</Button>
			{/each}
		{/if}
		<Button
			type="button"
			variant="outline"
			{disabled}
			class="h-auto justify-start border-dashed py-2 text-left text-muted-foreground"
			onclick={() => onAnswer({ kind: 'cant-tell' })}
		>
			I couldn’t tell
		</Button>
	</div>
	<p class="text-body-md text-muted-foreground">
		“I couldn’t tell” counts against you — and it is a finding worth recording, not a mistake.
	</p>
</div>
