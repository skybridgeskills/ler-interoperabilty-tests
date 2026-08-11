<script lang="ts">
	import { RunnableWalletAcceptancePage } from '$lib/pages/runnable-wallet-acceptance/index.js';

	let { data } = $props();
</script>

<RunnableWalletAcceptancePage
	profile="vcalm"
	attachExchangeId={data.attachExchangeId}
	attachWorkflow={data.attachWorkflow}
/>
