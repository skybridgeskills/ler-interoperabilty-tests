<script lang="ts">
	import type { Perspective } from '$lib/interop/perspective/index.js';

	import { perspectiveOptions } from './perspective-options.js';

	/**
	 * The Home hero's two-way Perspective switch: "I'm building" / "I'm
	 * evaluating". A **single-line pill at every width** — at 375px it tightens
	 * its padding, never its labels, and never wraps into a boxy lockup.
	 *
	 * A radio group: arrow keys move the choice, as they do in any radio group.
	 * Unset, a question precedes the pill; it drops once a Perspective is chosen.
	 */
	let {
		perspective,
		onChange
	}: {
		perspective: Perspective | undefined;
		onChange: (perspective: Perspective) => void;
	} = $props();

	const question = 'Building or evaluating?';
	let buttons: HTMLButtonElement[] = $state([]);

	function onKeydown(event: KeyboardEvent, index: number) {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
		if (!step) return;
		event.preventDefault();
		const next = (index + step + perspectiveOptions.length) % perspectiveOptions.length;
		onChange(perspectiveOptions[next].value);
		buttons[next]?.focus();
	}
</script>

<div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
	{#if !perspective}
		<span class="text-body-md text-muted-foreground">{question}</span>
	{/if}
	<div
		role="radiogroup"
		aria-label={question}
		class={[
			'inline-flex shrink-0 gap-0.5 rounded-full border bg-background/80 p-0.5',
			perspective ? 'border-perspective-border' : 'border-border'
		]}
	>
		{#each perspectiveOptions as option, index (option.value)}
			{@const checked = perspective === option.value}
			<button
				bind:this={buttons[index]}
				type="button"
				role="radio"
				aria-checked={checked}
				tabindex={checked || (!perspective && index === 0) ? 0 : -1}
				onclick={() => onChange(option.value)}
				onkeydown={(event) => onKeydown(event, index)}
				class={[
					'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-body-md font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none @xl:px-4',
					checked ? 'bg-perspective text-perspective-foreground' : 'text-foreground hover:bg-muted'
				]}
			>
				<option.icon class="size-4 shrink-0" aria-hidden="true" />
				{option.switchLabel}
			</button>
		{/each}
	</div>
</div>
