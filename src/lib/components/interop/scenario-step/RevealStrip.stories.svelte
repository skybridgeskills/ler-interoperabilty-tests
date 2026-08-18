<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		affirmAnsweredWrongly,
		answeredCorrectly,
		answeredWrongly,
		couldNotTell,
		handled,
		stored
	} from './fixtures.js';
	import RevealStrip from './RevealStrip.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Scenario Step/RevealStrip',
		component: RevealStrip
	});

	const question = handled.check.kind === 'attested' ? handled.check.answer : undefined;
</script>

{#snippet allThree()}
	<div class="max-w-md space-y-3">
		<RevealStrip outcome={answeredCorrectly} statement={handled.statement} answer={question} />
		<RevealStrip outcome={answeredWrongly} statement={handled.statement} answer={question} />
		<RevealStrip outcome={couldNotTell} statement={handled.statement} answer={question} />
	</div>
{/snippet}

<!--
	The three tones side by side. `can't tell` is amber, not red: it fails, and it
	must look like it failed, but it is the honest answer.
-->
<Story name="Three tones — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">{@render allThree()}</div>
		<div class="dark"><div class="bg-background p-6">{@render allThree()}</div></div>
	</div>
</Story>

<Story name="Correct" asChild>
	<div class="max-w-md bg-background p-6">
		<RevealStrip outcome={answeredCorrectly} statement={handled.statement} answer={question} />
	</div>
</Story>

<Story name="Wrong" asChild>
	<div class="max-w-md bg-background p-6">
		<RevealStrip outcome={answeredWrongly} statement={handled.statement} answer={question} />
	</div>
</Story>

<Story name="Couldn’t tell" asChild>
	<div class="max-w-md bg-background p-6">
		<RevealStrip outcome={couldNotTell} statement={handled.statement} answer={question} />
	</div>
</Story>

<!--
	An `affirm` question is authored so `true` is always expected, which makes its
	expected *value* useless to render — so the truth line shows the statement.
-->
<Story name="Wrong — affirm question" asChild>
	<div class="max-w-md bg-background p-6">
		<RevealStrip outcome={affirmAnsweredWrongly} statement={stored.statement} />
	</div>
</Story>

<Story name="Phone width" asChild>
	<div class="w-[375px] bg-background p-4">{@render allThree()}</div>
</Story>
