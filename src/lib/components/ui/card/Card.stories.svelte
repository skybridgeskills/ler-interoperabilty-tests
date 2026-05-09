<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './index.js';

	const { Story } = defineMeta({
		title: 'UI/Card',
		component: Card,
		parameters: {
			docs: {
				description: {
					component:
						'shadcn-svelte Card with header / title / description / content building blocks.'
				}
			}
		}
	});
</script>

<Story name="Default">
	<div class="grid max-w-3xl gap-4 bg-background p-6 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Wallet conformance</CardTitle>
				<CardDescription>Acceptance, presentation, revocation flows.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">
					Run a battery of fixtures through your wallet to validate spec compliance.
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Verifier conformance</CardTitle>
				<CardDescription>Trust, integrity, schema validation.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">
					Receive credentials from a known-good issuer and assert your verifier's behavior.
				</p>
			</CardContent>
		</Card>
	</div>
</Story>
