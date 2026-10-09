<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import type { Component } from 'svelte';

	import type { ToneClasses } from './filter-bar-tone.js';

	/**
	 * One dimension's button in the filter bar: `<n> <icon> <Label> · <summary> ▾`.
	 * The step number becomes a filled ✓ once the dimension has a selection, and an
	 * unset summary ("Any" / "None") reads muted italic. The accessible name stays
	 * "<Label> <summary>" — the number and the ✓ are decoration.
	 */
	let {
		ref = $bindable(),
		step,
		icon: Icon,
		label,
		summary,
		active,
		open,
		tone,
		onclick
	}: {
		ref?: HTMLButtonElement;
		step: number;
		icon: Component<{ class?: string; 'aria-hidden'?: 'true' }>;
		label: string;
		summary: string;
		/** The dimension has a selection. */
		active: boolean;
		/** This dimension's panel is the one showing. */
		open: boolean;
		tone: ToneClasses;
		onclick: () => void;
	} = $props();
</script>

<!--
	`relative z-40` puts the trigger above the panel's own top rail, so the
	underline and the rail read as one line the notch detours around rather than
	as two lines stacked.
-->
<button
	bind:this={ref}
	type="button"
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-controls="filter-panel"
	aria-label={`${label} ${summary}`}
	{onclick}
	class={`relative z-40 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-label-md transition-all duration-150 sm:w-auto sm:max-w-full sm:py-1 ${
		open
			? `rounded-b-none border-b-2 bg-transparent ${tone.text} ${tone.underline}`
			: `${active ? tone.text : 'text-muted-foreground'} ${tone.softHover}`
	}`}
>
	<span
		aria-hidden="true"
		class={`flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[0.65rem] leading-none ${
			active ? tone.pip : 'border-current'
		}`}
	>
		{#if active}<Check class="size-3" aria-hidden="true" />{:else}{step}{/if}
	</span>
	<Icon class="size-3.5 shrink-0" aria-hidden="true" />
	<span>{label}</span>
	<span aria-hidden="true" class="opacity-50">·</span>
	<span class={`min-w-0 truncate ${active ? 'text-foreground' : 'text-muted-foreground italic'}`}>
		{summary}
	</span>
	<span
		aria-hidden="true"
		class={`ml-auto text-xs opacity-70 transition-transform duration-200 sm:ml-0 ${open ? 'rotate-180' : ''}`}
		>▾</span
	>
</button>
