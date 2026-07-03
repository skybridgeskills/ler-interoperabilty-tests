<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import IssuerFlowWalletPanel from './IssuerFlowWalletPanel.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Issuer Flow Runner/IssuerFlowWalletPanel',
		component: IssuerFlowWalletPanel
	});

	const noop = () => {};
</script>

<Story name="Idle — paste interaction URL" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel onRun={noop} onReset={noop} />
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel
			interactionUrl="https://issuer.example/exchanges/ex-1"
			busy
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Verified" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel
			interactionUrl="https://issuer.example/exchanges/ex-1"
			done
			verified
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Not verified" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel
			interactionUrl="https://issuer.example/exchanges/ex-1"
			done
			failingMustCount={2}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Stopped early" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel
			interactionUrl="https://issuer.example/exchanges/ex-1"
			done
			blocked
			stoppedAtStep={2}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Error" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel
			interactionUrl="https://issuer.example/exchanges/ex-1"
			error={{
				message: 'The test wallet could not complete the issuer flow.',
				hint: 'Confirm the interaction URL is reachable and returns VCALM interaction protocols.'
			}}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>
