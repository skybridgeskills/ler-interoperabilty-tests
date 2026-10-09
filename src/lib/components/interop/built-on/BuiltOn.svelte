<script lang="ts">
	import { ExternalLink } from '$lib/components/external-link/index.js';
	import {
		citationHref,
		citationText,
		type StandardCitation,
		standardById
	} from '$lib/interop/standards.js';

	/**
	 * A Standard Profile's or add-on's "Built on" list: each standard by its short
	 * name, linked, with what kind of document it is — "VCALM 1.0 · W3C Working
	 * Draft ↗". Keeps a Standard Profile visibly distinct from the standards it
	 * builds on.
	 */
	let { standards }: { standards: StandardCitation[] } = $props();
</script>

<section class="space-y-3">
	<h2 class="text-headline-md">Built on</h2>
	<ul class="space-y-1.5 text-body-md">
		{#each standards as citation (citation.standard + (citation.section ?? ''))}
			{@const standard = standardById(citation.standard)}
			<li>
				<ExternalLink href={citationHref(citation)} title={`${standard.name} · ${standard.status}`}
					>{citationText(citation)}</ExternalLink
				>
				<span class="text-muted-foreground">· {standard.status}</span>
			</li>
		{/each}
	</ul>
</section>
