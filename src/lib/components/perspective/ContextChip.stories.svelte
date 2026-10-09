<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import ContextChip from './ContextChip.svelte';

	const { Story } = defineMeta({
		title: 'Components/Perspective/ContextChip',
		component: ContextChip
	});
</script>

<Story name="Role, Standard Profile, Add-on" asChild>
	<div class="flex flex-wrap gap-1.5">
		<ContextChip kind="role" label="Wallet" href="#wallet" />
		<ContextChip kind="profile" label="VCALM" href="#vcalm" />
		<ContextChip kind="addon" label="Data Integrity Cryptosuites" href="#dic" />
	</div>
</Story>
