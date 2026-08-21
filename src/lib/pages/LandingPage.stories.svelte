<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import LandingPage from './LandingPage.svelte';

	// Seed localStorage so the story renders the filtered console rather than the
	// unfiltered one. The page hydrates this on mount (browser-only), exactly as in
	// the real app. There are no run results to seed: the combination-keyed store
	// is gone, and these rows are statusless now.
	//
	// The selection is one that actually **matches** — wallet and verifier both
	// have OID4 scenario sets. A selection matching nothing renders the empty state
	// instead, which is the FilterBar's own stories' job to show.
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(
			'lits.selection.v1',
			JSON.stringify({
				roles: ['wallet', 'verifier'],
				profiles: ['oid4'],
				additiveProfiles: ['data-integrity-cryptosuites']
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
