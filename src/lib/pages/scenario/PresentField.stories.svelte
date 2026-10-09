<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import PresentField from './PresentField.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Scenario/PresentField',
		component: PresentField
	});

	const noop = () => {};
</script>

<!-- The default: a fresh interaction URL to paste, and "Present". -->
<Story name="Fresh URL" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentField onPresent={noop} />
	</div>
</Story>

<!-- A present is in flight — the field and button are disabled. -->
<Story name="Presenting" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentField value="https://verifier.example/interactions/ex-1" busy onPresent={noop} />
	</div>
</Story>

<!-- Transport miss: the amber note, and the button reads "Re-present". -->
<Story name="Transport retry" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentField
			retry
			note="The verifier did not accept the submission. Paste a fresh interaction URL and try again."
			onPresent={noop}
		/>
	</div>
</Story>
