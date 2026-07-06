<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import InlineMarkup from './InlineMarkup.svelte';

	const { Story } = defineMeta({
		title: 'Interop/InlineMarkup',
		component: InlineMarkup
	});
</script>

<Story name="Plain text" asChild>
	<p class="max-w-xl bg-background p-6 text-body-md text-foreground">
		<InlineMarkup text="No backticks here — renders exactly as before." />
	</p>
</Story>

<Story name="Single chip" asChild>
	<p class="max-w-xl bg-background p-6 text-body-md text-foreground">
		<InlineMarkup text="Request a `di_vp` format, not a JWT VP." />
	</p>
</Story>

<Story name="Multiple chips" asChild>
	<p class="max-w-xl bg-background p-6 text-body-md text-foreground">
		<InlineMarkup
			text="Create a VCALM exchange and a `verifiablePresentationRequest` using `QueryByExample` for `OpenBadgeCredential`."
		/>
	</p>
</Story>

<Story name="Unpaired trailing backtick" asChild>
	<p class="max-w-xl bg-background p-6 text-body-md text-foreground">
		<InlineMarkup text="A `code` chip and a lone ` backtick stays literal." />
	</p>
</Story>

<Story name="Empty span" asChild>
	<p class="max-w-xl bg-background p-6 text-body-md text-foreground">
		<InlineMarkup text="An empty `` span renders literally." />
	</p>
</Story>
