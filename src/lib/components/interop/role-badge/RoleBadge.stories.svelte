<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { allRoles } from '$lib/interop/index.js';

	import { RoleBadge } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/RoleBadge',
		component: RoleBadge,
		args: { role: allRoles[0] }
	});
</script>

<Story name="All roles">
	<div class="flex flex-wrap items-center gap-3 bg-background p-6">
		{#each allRoles as role (role.slug)}
			<RoleBadge {role} />
		{/each}
	</div>
</Story>
