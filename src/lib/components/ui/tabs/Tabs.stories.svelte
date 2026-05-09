<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { Tabs, TabsContent, TabsList, TabsTrigger } from './index.js';

	const { Story } = defineMeta({
		title: 'UI/Tabs',
		component: Tabs
	});
</script>

<Story name="Default">
	<div class="max-w-2xl bg-background p-6">
		<Tabs value="wallet" class="w-full">
			<TabsList>
				<TabsTrigger value="wallet">Wallet</TabsTrigger>
				<TabsTrigger value="verifier">Verifier</TabsTrigger>
				<TabsTrigger value="issuer">Issuer</TabsTrigger>
			</TabsList>
			<TabsContent value="wallet" class="pt-3 text-body-md text-muted-foreground">
				Acceptance and presentation flows for credential wallets.
			</TabsContent>
			<TabsContent value="verifier" class="pt-3 text-body-md text-muted-foreground">
				Conformance checks for verifier implementations.
			</TabsContent>
			<TabsContent value="issuer" class="pt-3 text-body-md text-muted-foreground">
				Self-checks and round-trip fixtures for issuers.
			</TabsContent>
		</Tabs>
	</div>
</Story>
