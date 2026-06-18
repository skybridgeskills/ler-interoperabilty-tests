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
			evaluator="Pick the role(s) you need a platform, vendor, or implementation to demonstrate, then review the matching checklists."
		/>
	</div>
</Story>
