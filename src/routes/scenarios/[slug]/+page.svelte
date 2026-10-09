<script lang="ts">
	import { ScenarioPage } from '$lib/pages/scenario/index.js';

	let { data } = $props();
</script>

<ScenarioPage
	scenario={data.scenario}
	attachExchangeId={data.attachExchangeId}
	blocked={data.blocked}
/>
