<script lang="ts" module>
	/**
	 * Protocol identifier used by the runner UI to track which deep
	 * link the right column is currently rendering. Lowercase JS-style
	 * identifier; the wire field on the protocols object is uppercase
	 * (`OID4VCI`) but that's a separate concern handled at the page
	 * boundary.
	 */
	export type ExchangeProtocolId = 'vcalm' | 'oid4vci';
</script>

<script lang="ts">
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';

	let {
		oid4vciAvailable,
		value,
		onChange
	}: {
		/**
		 * Whether the connected service exposes an OID4VCI deep link
		 * for this exchange. When false the selector renders nothing
		 * (the right column falls through to VCALM-only).
		 */
		oid4vciAvailable: boolean;
		value: ExchangeProtocolId;
		onChange: (next: ExchangeProtocolId) => void;
	} = $props();
</script>

{#if oid4vciAvailable}
	<Tabs {value} onValueChange={(v: string) => onChange(v as ExchangeProtocolId)} class="w-full">
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="vcalm" class="flex flex-col items-start gap-0.5 px-3 py-2 text-left">
				<span class="text-body-md font-medium">VCALM</span>
				<span class="text-label-md text-muted-foreground">VC-API exchange (default)</span>
			</TabsTrigger>
			<TabsTrigger value="oid4vci" class="flex flex-col items-start gap-0.5 px-3 py-2 text-left">
				<span class="text-body-md font-medium">OID4VCI</span>
				<span class="text-label-md text-muted-foreground">Pre-authorized code flow</span>
			</TabsTrigger>
		</TabsList>
	</Tabs>
{/if}
