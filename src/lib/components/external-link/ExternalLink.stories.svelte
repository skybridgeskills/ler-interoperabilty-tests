<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import ExternalLink from './ExternalLink.svelte';

	const { Story } = defineMeta({
		title: 'Components/ExternalLink',
		component: ExternalLink
	});
</script>

<Story name="Default and muted" asChild>
	<div class="space-y-2 text-body-md">
		<p>
			<ExternalLink
				href="https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html"
				title="OpenID for Verifiable Credential Issuance 1.0 · OpenID Final"
				>OID4VCI 1.0</ExternalLink
			>
		</p>
		<p class="text-label-md text-muted-foreground">
			Tests against
			<ExternalLink
				muted
				href="https://www.w3.org/TR/vcalm-1.0/"
				title="VCALM 1.0 · W3C Working Draft">VCALM 1.0</ExternalLink
			>
		</p>
	</div>
</Story>
