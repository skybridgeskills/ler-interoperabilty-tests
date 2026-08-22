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

	/**
	 * What a scenario this deployment cannot serve looks like on the console.
	 *
	 * Blocked-ness is per-deployment and slug-keyed, so a story can only fake it —
	 * the real map comes from `+page.server.ts` reading the tenant configuration.
	 * The row goes dim and reads "Unavailable here" with the reason underneath, and
	 * the meter beside it **does not move**: a blocked scenario keeps its
	 * requirements in the denominator and blocks the badge instead.
	 */
	const blocked = {
		'oid4-wallet-acceptance': {
			kind: 'cryptosuite-unavailable' as const,
			requested: 'ecdsa-rdfc-2019',
			available: ['eddsa-rdfc-2022']
		}
	};

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

<Story name="With a blocked scenario" asChild>
	<div class="min-h-screen bg-background p-12">
		<LandingPage {blocked} />
	</div>
</Story>
