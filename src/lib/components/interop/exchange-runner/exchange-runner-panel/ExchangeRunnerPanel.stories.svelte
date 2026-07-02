<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { ExchangeRunnerPanel } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Exchange Runner/ExchangeRunnerPanel',
		component: ExchangeRunnerPanel
	});

	const noopActions = { onInitiate: () => {} };

	const vcalmUrl = 'http://localhost:4004/interactions/example-uuid-1234';
	const oid4vciUrl =
		'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fexample-uuid-1234%2Fopenid%2Fcredential-offer';
</script>

<Story name="Idle" asChild>
	<div class="max-w-md bg-background p-6">
		<ExchangeRunnerPanel
			data={{ run: 'idle', perStep: ['pending', 'pending', 'pending', 'pending', 'pending'] }}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Awaiting wallet — VCALM" asChild>
	<div class="max-w-md bg-background p-6">
		<ExchangeRunnerPanel
			data={{
				run: 'awaiting-wallet',
				perStep: ['in-flight', 'pending', 'pending', 'pending', 'pending'],
				interactionUrl: vcalmUrl,
				headerLabel: 'Live · interaction URL',
				exchangeId: 'example-uuid-1234'
			}}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Awaiting wallet — OID4VCI" asChild>
	<div class="max-w-md bg-background p-6">
		<ExchangeRunnerPanel
			data={{
				run: 'awaiting-wallet',
				perStep: ['in-flight', 'pending', 'pending', 'pending'],
				interactionUrl: oid4vciUrl,
				headerLabel: 'Live · OID4VCI offer',
				exchangeId: 'example-uuid-1234'
			}}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Wallet connected — OID4VCI" asChild>
	<div class="max-w-md bg-background p-6">
		<ExchangeRunnerPanel
			data={{
				run: 'wallet-connected',
				perStep: ['complete', 'complete', 'in-flight', 'pending'],
				interactionUrl: oid4vciUrl,
				headerLabel: 'Live · OID4VCI offer',
				exchangeId: 'example-uuid-1234'
			}}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Complete" asChild>
	<div class="max-w-md bg-background p-6">
		<ExchangeRunnerPanel
			data={{
				run: 'complete',
				perStep: ['complete', 'complete', 'complete', 'complete'],
				exchangeId: 'example-uuid-1234'
			}}
			actions={{ ...noopActions, onReset: () => {} }}
		/>
	</div>
</Story>

<Story name="Error / unreachable" asChild>
	<div class="max-w-md bg-background p-6">
		<ExchangeRunnerPanel
			data={{
				run: 'error',
				perStep: ['skipped', 'skipped', 'skipped', 'skipped'],
				error: {
					message: 'Cannot reach the local DCC transaction service.',
					hint: 'Run `pnpm turbo dev:full` to start the dependency services.'
				}
			}}
			actions={noopActions}
		/>
	</div>
</Story>
