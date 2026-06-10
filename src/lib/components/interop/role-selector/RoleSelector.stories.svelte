<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SvelteSet } from 'svelte/reactivity';

	import { allRoles, type RoleSlug } from '$lib/interop/index.js';

	import { RoleSelector } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/RoleSelector',
		component: RoleSelector
	});

	function toggler(set: SvelteSet<RoleSlug>) {
		return (slug: RoleSlug) => {
			if (set.has(slug)) set.delete(slug);
			else set.add(slug);
		};
	}
</script>

<script lang="ts">
	const none = new SvelteSet<RoleSlug>();
	const some = new SvelteSet<RoleSlug>(['issuer']);
	const all = new SvelteSet<RoleSlug>(['issuer', 'wallet', 'verifier']);
</script>

<Story name="None selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<RoleSelector
			roles={allRoles}
			selected={none}
			onToggle={toggler(none)}
			description="Choose the role(s) you build or evaluate. Wallets play the holder role."
			builderNote="Pick the role(s) your product plays."
			buyerNote="Pick the role you're evaluating a vendor for."
		/>
	</div>
</Story>

<Story name="Some selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<RoleSelector roles={allRoles} selected={some} onToggle={toggler(some)} />
	</div>
</Story>

<Story name="All selected" asChild>
	<div class="max-w-3xl bg-background p-6">
		<RoleSelector roles={allRoles} selected={all} onToggle={toggler(all)} />
	</div>
</Story>
