<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SvelteSet } from 'svelte/reactivity';

	import { allProfiles, type ProfileSlug } from '$lib/interop/index.js';

	import { ProfileSelector } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/ProfileSelector',
		component: ProfileSelector
	});

	function toggler(set: SvelteSet<ProfileSlug>) {
		return (slug: ProfileSlug) => {
			if (set.has(slug)) set.delete(slug);
			else set.add(slug);
		};
	}
</script>

<script lang="ts">
	const none = new SvelteSet<ProfileSlug>();
	const some = new SvelteSet<ProfileSlug>(['vcalm']);
	const all = new SvelteSet<ProfileSlug>(allProfiles.map((p) => p.slug));
</script>

<Story name="None selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<ProfileSelector
			profiles={allProfiles}
			selected={none}
			onToggle={toggler(none)}
			builderNote="Cover the profiles your product needs to interoperate with."
			buyerNote="Pick the profiles your ecosystem requires, then ask vendors to prove them."
		/>
	</div>
</Story>

<Story name="Some selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<ProfileSelector profiles={allProfiles} selected={some} onToggle={toggler(some)} />
	</div>
</Story>

<Story name="All selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<ProfileSelector profiles={allProfiles} selected={all} onToggle={toggler(all)} />
	</div>
</Story>
