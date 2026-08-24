<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import AnswerPrompt from './AnswerPrompt.svelte';
	import { handled, stored } from './fixtures.js';

	const { Story } = defineMeta({
		title: 'Interop/Scenario Step/AnswerPrompt',
		component: AnswerPrompt
	});

	const choose = handled.check.kind === 'attested' ? handled.check.answer : undefined;
	const affirm = stored.check.kind === 'attested' ? stored.check.answer : undefined;
	const noop = () => {};
</script>

<!-- `can't tell` is appended by the component on every question, always. -->
<Story name="Choose" asChild>
	<div class="max-w-md bg-background p-6">
		{#if choose}<AnswerPrompt answer={choose} onAnswer={noop} />{/if}
	</div>
</Story>

<Story name="Affirm" asChild>
	<div class="max-w-md bg-background p-6">
		{#if affirm}<AnswerPrompt answer={affirm} onAnswer={noop} />{/if}
	</div>
</Story>

<Story name="Disabled" asChild>
	<div class="max-w-md bg-background p-6">
		{#if choose}<AnswerPrompt answer={choose} onAnswer={noop} disabled />{/if}
	</div>
</Story>

<Story name="Phone width — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="w-[375px] bg-background p-4">
			{#if choose}<AnswerPrompt answer={choose} onAnswer={noop} />{/if}
		</div>
		<div class="dark">
			<div class="w-[375px] bg-background p-4">
				{#if choose}<AnswerPrompt answer={choose} onAnswer={noop} />{/if}
			</div>
		</div>
	</div>
</Story>
