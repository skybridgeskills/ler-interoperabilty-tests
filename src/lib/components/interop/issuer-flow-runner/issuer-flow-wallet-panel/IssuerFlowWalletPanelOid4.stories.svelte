<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import IssuerFlowWalletPanel from './IssuerFlowWalletPanel.svelte';

	const { Story } = defineMeta({
		title: 'Components/IssuerFlowRunner/IssuerFlowWalletPanel (OID4)',
		component: IssuerFlowWalletPanel
	});

	const noop = () => {};

	// The OID4VCI copy the runnable issuer OID4 page passes to the shared panel.
	const oid4 = {
		title: 'Run the test wallet against your OID4VCI issuer',
		blurb:
			'Paste the `openid-credential-offer://` URL you generated on your issuer. The test wallet acts as the holder — discovering issuer metadata, redeeming the pre-authorized code, presenting a `di_vp` key proof, and receiving the credential — then lights up each requirement below with a pass, fail, warning, or n/a.',
		inputLabel: 'Credential offer URL',
		inputPlaceholder: 'openid-credential-offer://?credential_offer_uri=…',
		inputType: 'text' as const,
		verifiedCopy:
			'The test wallet completed the whole OID4VCI pre-authorized-code issuance flow and no MUST requirements failed.'
	};

	const OFFER =
		'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example%2Foffer';
</script>

<Story name="Idle — paste offer URL" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel {...oid4} onRun={noop} onReset={noop} />
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel {...oid4} interactionUrl={OFFER} busy onRun={noop} onReset={noop} />
	</div>
</Story>

<Story name="Verified" asChild>
	<div class="max-w-md bg-background p-6">
		<IssuerFlowWalletPanel
			{...oid4}
			interactionUrl={OFFER}
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
			{...oid4}
			interactionUrl={OFFER}
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
			{...oid4}
			interactionUrl={OFFER}
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
			{...oid4}
			interactionUrl={OFFER}
			error={{
				message: 'The credential-offer URL could not be reached.',
				hint: 'Confirm the `openid-credential-offer://` URL is reachable and is a pre-authorized-code offer.'
			}}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>
