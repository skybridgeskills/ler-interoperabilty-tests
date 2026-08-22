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
	 * The two `dic-wallet-accept-ecdsa` members are the catalog's real pinned
	 * scenarios, and this is exactly what a deployment with only an EdDSA tenant
	 * shows for them. Blocked-ness is per-deployment, so a story can only stand it
	 * in — the live map comes from `+page.server.ts` reading tenant configuration.
	 *
	 * The rows go dim and read "Unavailable here" with the reason underneath, and
	 * the add-on meter beside them **does not move**: a blocked scenario keeps its
	 * requirements in the denominator and blocks the badge instead.
	 */
	const cannotServeEcdsa = {
		kind: 'cryptosuite-unavailable' as const,
		requested: 'ecdsa-rdfc-2019',
		available: ['eddsa-rdfc-2022']
	};

	const blocked = {
		'oid4-wallet-accept-ecdsa': cannotServeEcdsa,
		'vcalm-wallet-accept-ecdsa': cannotServeEcdsa
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
