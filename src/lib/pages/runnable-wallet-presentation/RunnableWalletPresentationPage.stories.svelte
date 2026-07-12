<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { RunnableWalletPresentationPage } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableWalletPresentation',
		component: RunnableWalletPresentationPage
	});
</script>

<!--
	Idle state for both presentation profiles: the wallet credential-presentation checklist on the
	left and the intent-driven ExchangeRunnerPanel on the right ("Initiate a verification exchange"),
	waiting on "Initiate exchange". The live run states are driven at runtime by
	`POST /api/exchange-runner/create` (verification) → `pollExchange(?workflow=verify)` →
	`POST /api/wallet-runner/present-score`. The awaiting / verifying / complete / invalid visual
	states are covered by the ExchangeRunnerPanel intent/protocol matrix and RequirementReport
	component stories; page stories render idle only (no in-story fetch mocking), matching the other
	runnable page stories.
-->
<Story name="Idle — VCALM (iu)" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableWalletPresentationPage profile="vcalm" />
	</div>
</Story>

<Story name="Idle — OID4VP" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableWalletPresentationPage profile="oid4" />
	</div>
</Story>
