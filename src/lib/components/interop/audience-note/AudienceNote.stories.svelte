<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { AudienceNote } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/AudienceNote',
		component: AudienceNote
	});
</script>

<Story name="Default" asChild>
	<div class="max-w-2xl bg-background p-6">
		<AudienceNote
			title="Why pick a role?"
			builder="Choose the role(s) your product plays so the checklists below match what you actually have to build."
			buyer="Pick the role you're evaluating a vendor for, then ask them to demonstrate the matching checklists."
		/>
	</div>
</Story>
