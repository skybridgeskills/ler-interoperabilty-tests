<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { recordRun } from '$lib/client/run-history/index.js';
	import { statusFromExchange, statusFromIssuerReport, testRunRecord } from '$lib/interop/index.js';

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
		recordRun(
			testRunRecord({
				role: 'issuer',
				workflow: 'direct-credential-issuance',
				profile: 'ob3-direct-delivery',
				status: statusFromIssuerReport({ verified: true }),
				checklistFingerprint: '',
				statuses: {}
			})
		);
		recordRun(
			testRunRecord({
				role: 'wallet',
				workflow: 'credential-acceptance',
				profile: 'vcalm',
				status: statusFromExchange({ run: 'awaiting-wallet', perStep: ['in-flight', 'pending'] }),
				checklistFingerprint: '',
				statuses: {}
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
