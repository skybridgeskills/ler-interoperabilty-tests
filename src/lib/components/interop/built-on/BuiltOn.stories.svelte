<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { profileBySlug } from '$lib/interop/index.js';

	import BuiltOn from './BuiltOn.svelte';

	const vcalm = profileBySlug('vcalm')!;

	const { Story } = defineMeta({
		title: 'Interop/BuiltOn',
		component: BuiltOn
	});
</script>

<Story name="VCALM" asChild>
	<div class="bg-background p-6">
		<BuiltOn standards={vcalm.standards} />
	</div>
</Story>
