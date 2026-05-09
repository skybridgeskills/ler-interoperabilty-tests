<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';

	import { resolve } from '$app/paths';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		A self-help kit for developers building wallets, verifiers, and issuers for Open Badges
		credentials and other Learning &amp; Employment Records. Run interop checks against your stack,
		browse fixtures, and verify your implementations behave the way other ecosystem participants
		expect.
	</p>
</section>

<section class="mt-12 grid gap-6 md:grid-cols-3">
	<a href={resolve('/wallet')} class="block">
		<Card class="transition hover:border-primary">
			<CardHeader>
				<CardTitle>Wallet</CardTitle>
				<CardDescription>Acceptance and presentation flows for credential wallets.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">Coming soon.</p>
			</CardContent>
		</Card>
	</a>

	<a href={resolve('/verifier')} class="block">
		<Card class="transition hover:border-primary">
			<CardHeader>
				<CardTitle>Verifier</CardTitle>
				<CardDescription>Conformance checks for verifier implementations.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">Coming soon.</p>
			</CardContent>
		</Card>
	</a>

	<a href={resolve('/issuer')} class="block">
		<Card class="transition hover:border-primary">
			<CardHeader>
				<CardTitle>Issuer</CardTitle>
				<CardDescription>Self-checks and round-trip fixtures for issuers.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">Coming soon.</p>
			</CardContent>
		</Card>
	</a>
</section>
