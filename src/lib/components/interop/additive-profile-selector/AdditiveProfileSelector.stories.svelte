<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SvelteSet } from 'svelte/reactivity';

	import { allAdditiveProfiles, type AdditiveProfileSlug } from '$lib/interop/index.js';

	import { AdditiveProfileSelector } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/AdditiveProfileSelector',
		component: AdditiveProfileSelector
	});

	function toggler(set: SvelteSet<AdditiveProfileSlug>) {
		return (slug: AdditiveProfileSlug) => {
			if (set.has(slug)) set.delete(slug);
			else set.add(slug);
		};
	}
</script>

<script lang="ts">
	const none = new SvelteSet<AdditiveProfileSlug>();
	const some = new SvelteSet<AdditiveProfileSlug>(['data-integrity-cryptosuites']);
	const all = new SvelteSet<AdditiveProfileSlug>(allAdditiveProfiles.map((p) => p.slug));
</script>

<Story name="None selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<AdditiveProfileSelector
			profiles={allAdditiveProfiles}
			selected={none}
			onToggle={toggler(none)}
		/>
	</div>
</Story>

<Story name="Some selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<AdditiveProfileSelector
			profiles={allAdditiveProfiles}
			selected={some}
			onToggle={toggler(some)}
		/>
	</div>
</Story>

<Story name="All selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<AdditiveProfileSelector
			profiles={allAdditiveProfiles}
			selected={all}
			onToggle={toggler(all)}
		/>
	</div>
</Story>
