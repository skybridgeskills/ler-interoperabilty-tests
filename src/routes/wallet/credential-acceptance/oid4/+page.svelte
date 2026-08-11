<script lang="ts">
	import { RunnableWalletAcceptancePage } from '$lib/pages/runnable-wallet-acceptance/index.js';

	let { data } = $props();
</script>

<RunnableWalletAcceptancePage
	profile="oid4"
	attachExchangeId={data.attachExchangeId}
	attachWorkflow={data.attachWorkflow}
/>
