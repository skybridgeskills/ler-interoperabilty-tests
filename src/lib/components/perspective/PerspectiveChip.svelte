<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import User from '@lucide/svelte/icons/user';
	import { DropdownMenu } from 'bits-ui';

	import type { Perspective } from '$lib/interop/perspective/index.js';

	import { perspectiveOption, perspectiveOptions } from './perspective-options.js';

	/**
	 * The Perspective switch on every compact hero: the first chip in the row,
	 * and itself the control. Unset it is a dashed neutral "Choose perspective";
	 * chosen it speaks orchid with the Perspective's icon and noun. Clicking opens
	 * a two-option menu that repeats each one-line description.
	 */
	let {
		perspective,
		onChange,
		open = $bindable(false)
	}: {
		perspective: Perspective | undefined;
		onChange: (perspective: Perspective) => void;
		/** Bindable so a story can render the menu open. */
		open?: boolean;
	} = $props();

	const chosen = $derived(perspective ? perspectiveOption(perspective) : undefined);
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger
		class={[
			'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-body-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
			chosen
				? 'border-perspective-border bg-perspective-soft font-medium text-perspective hover:border-perspective'
				: 'border-dashed border-border bg-background/80 text-muted-foreground hover:border-perspective-border hover:text-foreground'
		]}
	>
		{#if chosen}
			<chosen.icon class="size-3.5 shrink-0" aria-hidden="true" />
			<span class="sr-only">Perspective:</span>
			{chosen.noun}
		{:else}
			<User class="size-3.5 shrink-0" aria-hidden="true" />
			Choose perspective
		{/if}
		<ChevronDown class="size-3.5 shrink-0" aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			align="start"
			sideOffset={6}
			class="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-ambient outline-none"
		>
			<DropdownMenu.RadioGroup
				value={perspective ?? ''}
				onValueChange={(value) => {
					const option = perspectiveOptions.find((o) => o.value === value);
					if (option) onChange(option.value);
				}}
			>
				{#each perspectiveOptions as option (option.value)}
					<DropdownMenu.RadioItem
						value={option.value}
						class="flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 outline-none data-highlighted:bg-muted"
					>
						{#snippet children({ checked })}
							<option.icon class="mt-0.5 size-4 shrink-0 text-perspective" aria-hidden="true" />
							<span class="min-w-0 flex-1">
								<span class="block text-body-md font-medium text-foreground">{option.verb}</span>
								<span class="block text-body-md text-muted-foreground">{option.description}</span>
							</span>
							{#if checked}
								<Check class="mt-0.5 size-4 shrink-0 text-perspective" aria-hidden="true" />
							{/if}
						{/snippet}
					</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
