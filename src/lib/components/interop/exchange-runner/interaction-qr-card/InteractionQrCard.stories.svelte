<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { InteractionQrCard } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Exchange Runner/InteractionQrCard',
		component: InteractionQrCard
	});
</script>

<Story name="Local exchange" asChild>
	<div class="max-w-md bg-background p-6">
		<InteractionQrCard interactionUrl="http://localhost:4004/interactions/abc-123-uuid-stub-here" />
	</div>
</Story>

<Story name="OID4VCI offer" asChild>
	<div class="max-w-md bg-background p-6">
		<InteractionQrCard
			interactionUrl="openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer"
			headerLabel="Live · OID4VCI offer"
		/>
	</div>
</Story>
