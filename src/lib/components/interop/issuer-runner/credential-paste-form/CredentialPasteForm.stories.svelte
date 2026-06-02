<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { CredentialPasteForm } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Issuer Runner/CredentialPasteForm',
		component: CredentialPasteForm
	});

	const noopActions = {
		onChange: () => {},
		onToggleAdditive: () => {},
		onLoadSample: () => {},
		onVerify: () => {}
	};
</script>

<Story name="Empty" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CredentialPasteForm value="" includeAdditive={false} status="idle" {...noopActions} />
	</div>
</Story>

<Story name="With content, additive on" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CredentialPasteForm
			value={'{ "@context": [], "type": ["VerifiableCredential"] }'}
			includeAdditive={true}
			status="idle"
			{...noopActions}
		/>
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CredentialPasteForm
			value={'{ "@context": [] }'}
			includeAdditive={true}
			status="running"
			{...noopActions}
		/>
	</div>
</Story>
