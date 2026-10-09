<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import FramingBlock from './FramingBlock.svelte';

	/** Placeholder text, story only — the catalog's framing is authored separately. */
	const { Story } = defineMeta({
		title: 'Components/Perspective/FramingBlock',
		component: FramingBlock
	});
</script>

<Story name="Builder" asChild>
	<FramingBlock
		perspective="builder"
		text="[Placeholder] How a Builder approaches this scenario, running it against their own build."
	/>
</Story>

<Story name="Evaluator" asChild>
	<FramingBlock
		perspective="evaluator"
		text="[Placeholder] How an Evaluator approaches this scenario, watching a vendor demonstrate it."
	/>
</Story>
