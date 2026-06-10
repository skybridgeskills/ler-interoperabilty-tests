<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { runCombinationKey } from '$lib/client/run-history/index.js';
	import { exchangeRunRecord, issuerReportRunRecord } from '$lib/interop/index.js';

	import LandingPage from './LandingPage.svelte';

	// Seed localStorage so the story renders the populated console: a couple of
	// roles/profiles selected and a mix of run results. The page hydrates these
	// from localStorage on mount (browser-only), exactly as in the real app.
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(
			'lits.selection.v1',
			JSON.stringify({
				roles: ['issuer', 'wallet'],
				profiles: ['vcalm', 'ob3-direct-delivery'],
				additiveProfiles: ['data-integrity-cryptosuites']
			})
		);
		const passed = issuerReportRunRecord({
			role: 'issuer',
			workflow: 'direct-credential-issuance',
			profile: 'ob3-direct-delivery',
			verified: true,
			failingMustCount: 0
		});
		const incomplete = exchangeRunRecord({
			role: 'wallet',
			workflow: 'credential-acceptance',
			profile: 'vcalm',
			exchangeState: 'active',
			derived: { run: 'awaiting-wallet', perStep: ['in-flight', 'pending'] }
		});
		localStorage.setItem(
			'lits.run-history.v1',
			JSON.stringify({
				[runCombinationKey('issuer', 'direct-credential-issuance', 'ob3-direct-delivery')]: [
					passed
				],
				[runCombinationKey('wallet', 'credential-acceptance', 'vcalm')]: [incomplete]
			})
		);
	}

	const { Story } = defineMeta({
		title: 'Pages/LandingPage',
		component: LandingPage
	});
</script>

<Story name="Default" asChild>
	<div class="min-h-screen bg-background p-12">
		<LandingPage />
	</div>
</Story>
