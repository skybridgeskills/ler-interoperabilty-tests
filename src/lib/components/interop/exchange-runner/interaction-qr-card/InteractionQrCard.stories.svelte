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

<!--
	Phone width. The QR-beside-link arrangement measured 261px inside a 243px box
	at 375px and squeezed the Copy button; this story pins the narrow case so the
	regression cannot come back silently.
-->
<Story name="Phone width" asChild>
	<div class="w-[375px] bg-background p-4">
		<InteractionQrCard
			interactionUrl="openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer"
			headerLabel="Live · OID4VCI offer"
		/>
	</div>
</Story>
