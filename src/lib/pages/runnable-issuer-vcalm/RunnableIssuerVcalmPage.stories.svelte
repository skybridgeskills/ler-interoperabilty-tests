<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { RunnableIssuerVcalmPage } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableIssuerVcalm',
		component: RunnableIssuerVcalmPage
	});
</script>

<!--
	Idle state: the full runnable checklist with the flame-orange test-wallet panel and its
	interaction-URL input. Live run states (pass/fail/blocked) are driven by the `/run` API and are
	covered by the VcalmIssuerFlowWallet + RunResultCard + RequirementStatusRow component stories.
-->
<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableIssuerVcalmPage />
	</div>
</Story>
