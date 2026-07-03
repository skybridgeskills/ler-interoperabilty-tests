<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { additiveChecklistsForCombination, combinationFor } from '$lib/interop/index.js';

	import { AdditiveChecklistSection } from './index.js';

	const combo = combinationFor('issuer', 'credential-issuance', 'vcalm')!;
	const [sample] = additiveChecklistsForCombination('vcalm', 'issuer', 'credential-issuance');

	const { Story } = defineMeta({
		title: 'Interop/AdditiveChecklistSection',
		component: AdditiveChecklistSection
	});
</script>

<Story name="Collapsed (not selected)" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<AdditiveChecklistSection
			additive={sample.additive}
			checklist={sample.checklist}
			baseProfileName={combo.profile.name}
			selected={false}
			onToggle={() => {}}
		/>
	</div>
</Story>

<Story name="Expanded (selected)" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<AdditiveChecklistSection
			additive={sample.additive}
			checklist={sample.checklist}
			baseProfileName={combo.profile.name}
			selected={true}
			onToggle={() => {}}
		/>
	</div>
</Story>
