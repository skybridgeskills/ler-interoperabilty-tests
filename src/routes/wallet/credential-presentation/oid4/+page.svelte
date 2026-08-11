<script lang="ts">
	import { RunnableWalletPresentationPage } from '$lib/pages/runnable-wallet-presentation/index.js';

	let { data } = $props();
</script>

<RunnableWalletPresentationPage
	profile="oid4"
	attachExchangeId={data.attachExchangeId}
	attachWorkflow={data.attachWorkflow}
/>
