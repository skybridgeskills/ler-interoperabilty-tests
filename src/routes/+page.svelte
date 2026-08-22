<script lang="ts">
	import LandingPage from '$lib/pages/LandingPage.svelte';

	// Blocked-ness comes from the server load — the page component stays
	// parameterised rather than location-aware, so Storybook renders the same
	// component without a deployment behind it.
	let { data } = $props();
</script>

<LandingPage blocked={data.blocked} />
