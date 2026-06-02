<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { ProtocolSelector } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Exchange Runner/ProtocolSelector',
		component: ProtocolSelector
	});

	const noop = () => {};
</script>

<Story name="Both protocols available" asChild>
	<div class="max-w-md bg-background p-6">
		<ProtocolSelector oid4vciAvailable={true} value="vcalm" onChange={noop} />
	</div>
</Story>

<Story name="OID4VCI initially selected" asChild>
	<div class="max-w-md bg-background p-6">
		<ProtocolSelector oid4vciAvailable={true} value="oid4vci" onChange={noop} />
	</div>
</Story>

<Story name="VCALM only (legacy container)" asChild>
	<div class="max-w-md bg-background p-6">
		<p class="text-label-md text-muted-foreground">
			Selector renders nothing when the response omits `OID4VCI`.
		</p>
		<ProtocolSelector oid4vciAvailable={false} value="vcalm" onChange={noop} />
	</div>
</Story>
