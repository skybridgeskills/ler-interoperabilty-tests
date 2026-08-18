<script lang="ts">
	import { BadgePage } from '$lib/pages/badge/index.js';

	let { data } = $props();
</script>

<BadgePage
	badge={data.badge}
	criteriaNarrative={data.criteriaNarrative}
	achievementId={data.achievementId}
	criteriaId={data.criteriaId}
	versionMismatch={data.versionMismatch}
	blocked={data.blocked}
/>
