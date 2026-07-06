<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import PresentationRequestField from './PresentationRequestField.svelte';

	const { Story } = defineMeta({
		title: 'Pages/RunnableVerifierOid4/PresentationRequestField',
		component: PresentationRequestField
	});

	const noop = () => {};
</script>

<!-- No previous request to reuse: only the paste field + "Present" button. -->
<Story name="Fresh request only" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentationRequestField credentialNumber={2} canReuse={false} onPresent={noop} />
	</div>
</Story>

<!-- Reuse offered and chosen (the default when the previous present reached the endpoint). -->
<Story name="Reuse offered — checked" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentationRequestField credentialNumber={3} canReuse reuse onPresent={noop} />
	</div>
</Story>

<!-- Reuse offered but unchecked: the paste field returns for a fresh request. -->
<Story name="Reuse offered — unchecked" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentationRequestField credentialNumber={3} canReuse reuse={false} onPresent={noop} />
	</div>
</Story>

<!-- Transport retry: the fresh-request field with the retry note and the "Re-present" label. -->
<Story name="Transport retry" asChild>
	<div class="max-w-md bg-background p-6">
		<PresentationRequestField
			credentialNumber={2}
			canReuse={false}
			retry
			note="The presentation was not accepted at the response endpoint. Paste a fresh request and re-present, or record the verdict below."
			onPresent={noop}
		/>
	</div>
</Story>
