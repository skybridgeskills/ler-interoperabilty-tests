<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import type { Perspective } from '$lib/interop/perspective/index.js';

	import { perspectiveOptions } from './perspective-options.js';

	/**
	 * The first-visit gate: asks once how the reader is using the suite. Shown
	 * only while the reader is **undecided** — no `lits.perspective` cookie at all
	 * — on whichever page they landed on, deep links included. There is no
	 * default. "Not now", Escape and a click on the scrim all dismiss: the page
	 * stays neutral and the gate does not return.
	 *
	 * A centred dialog from `sm:` up; below it, a bottom sheet — full width, cards
	 * stacked, a full-width Not now, an orchid rail on its top edge, no swipe to
	 * dismiss. Excluded from print. Prop-driven: the layout owns the store.
	 */
	let {
		open,
		onChoose,
		onDismiss
	}: {
		open: boolean;
		onChoose: (perspective: Perspective) => void;
		onDismiss: () => void;
	} = $props();
</script>

<Dialog.Root
	{open}
	onOpenChange={(next) => {
		// Only a close the reader caused while still undecided is a dismissal; a
		// choice closes the gate by flipping `open`, and must not be overwritten.
		if (!next && open) onDismiss();
	}}
>
	<Dialog.Content
		showCloseButton={false}
		portalProps={{ disabled: true }}
		overlayClass="print:hidden"
		class="gap-5 overflow-hidden p-6 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:rounded-t-2xl max-sm:pt-7 max-sm:data-open:zoom-in-100 max-sm:data-open:slide-in-from-bottom-8 sm:max-w-lg print:hidden"
	>
		<!-- The sheet's rail: the gate is Perspective UI, so it carries the orchid. -->
		<div class="absolute inset-x-0 top-0 h-1 bg-perspective sm:hidden" aria-hidden="true"></div>
		<Dialog.Header class="gap-1.5">
			<Dialog.Title class="text-title-lg">How are you using LER Tests?</Dialog.Title>
			<Dialog.Description class="text-body-md text-muted-foreground">
				This changes the guidance you see, not the tests. You can switch any time.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each perspectiveOptions as option (option.value)}
				<button
					type="button"
					onclick={() => onChoose(option.value)}
					class="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-perspective-border hover:bg-perspective-soft focus-visible:border-perspective-border focus-visible:bg-perspective-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<option.icon class="size-5 text-perspective" aria-hidden="true" />
					<span class="text-title-lg text-foreground">{option.verb}</span>
					<span class="text-body-md text-muted-foreground">{option.description}</span>
				</button>
			{/each}
		</div>
		<Button variant="ghost" class="w-full sm:w-auto sm:justify-self-center" onclick={onDismiss}>
			Not now
		</Button>
	</Dialog.Content>
</Dialog.Root>
