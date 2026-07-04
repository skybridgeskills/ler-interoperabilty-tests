<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { WalletActivityEntry } from '../test-wallet-types.js';

	import WalletActivityList from './WalletActivityList.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/WalletActivityList',
		component: WalletActivityList
	});

	// Every status × kind so the shared status language (RunStatusIndicator tones) is visible.
	const allStatuses: WalletActivityEntry[] = [
		{ id: '1', kind: 'interaction', label: 'Fetched the interaction exchange', status: 'ok' },
		{
			id: '2',
			kind: 'interaction',
			label: 'Authenticating with a did:key holder…',
			detail: 'Waiting on the issuer response',
			status: 'info'
		},
		{
			id: '3',
			kind: 'check',
			label: 'Credential signature verified',
			detail: 'eddsa-rdfc-2022 · issuer key matched',
			status: 'ok'
		},
		{
			id: '4',
			kind: 'check',
			label: 'Expiration within policy',
			detail: 'Expires in 14 days',
			status: 'warn'
		},
		{
			id: '5',
			kind: 'check',
			label: 'Credential signature verified',
			detail: 'Proof did not verify against the issuer key',
			status: 'fail'
		},
		{
			id: '6',
			kind: 'check',
			label: 'Credential delivery',
			detail: 'Not reached — flow stopped early',
			status: 'skipped'
		}
	];
</script>

{#snippet emptyActivity()}
	<p class="text-body-md text-muted-foreground">Run the wallet to see interactions and checks.</p>
{/snippet}

<Story name="All statuses" asChild>
	<div class="max-w-md bg-background p-6">
		<WalletActivityList activity={allStatuses} />
	</div>
</Story>

<Story name="Empty — with snippet" asChild>
	<div class="max-w-md bg-background p-6">
		<WalletActivityList {emptyActivity} />
	</div>
</Story>

<Story name="Empty — fallback line" asChild>
	<div class="max-w-md bg-background p-6">
		<WalletActivityList />
	</div>
</Story>
