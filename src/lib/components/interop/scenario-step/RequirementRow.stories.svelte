<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		answeredCorrectly,
		answeredWrongly,
		autoFail,
		autoPass,
		couldNotTell,
		displayed,
		exchangeComplete,
		handled
	} from './fixtures.js';
	import RequirementRow from './RequirementRow.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Scenario Step/RequirementRow',
		component: RequirementRow
	});

	const noop = () => {};
</script>

{#snippet everyState()}
	<div class="max-w-2xl space-y-4">
		<RequirementRow requirement={exchangeComplete} outcome={autoPass} />
		<RequirementRow requirement={exchangeComplete} outcome={autoFail} />
		<RequirementRow requirement={exchangeComplete} />
		<RequirementRow requirement={handled} onAnswer={noop} />
		<RequirementRow requirement={handled} outcome={answeredCorrectly} />
		<RequirementRow requirement={handled} outcome={answeredWrongly} />
		<RequirementRow requirement={handled} outcome={couldNotTell} />
		<RequirementRow requirement={displayed} pending />
	</div>
{/snippet}

<!-- Every state the row can be in, in one column. -->
<Story name="Every state — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">{@render everyState()}</div>
		<div class="dark"><div class="bg-background p-6">{@render everyState()}</div></div>
	</div>
</Story>

<Story name="Automatic — resolved" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementRow requirement={exchangeComplete} outcome={autoPass} />
	</div>
</Story>

<Story name="Automatic — unresolved" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementRow requirement={exchangeComplete} />
	</div>
</Story>

<Story name="Attested — unanswered" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementRow requirement={handled} onAnswer={noop} />
	</div>
</Story>

<Story name="Attested — answered and revealed" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementRow requirement={handled} outcome={answeredWrongly} />
	</div>
</Story>

<!--
	Mid-run, the reveal is held: a neutral echo of the chosen answer, no tone dot,
	no verdict, no ground truth — nothing that primes the next shuffled pass.
-->
<Story name="Attested — answered, reveal withheld" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementRow requirement={handled} outcome={answeredWrongly} revealed={false} />
	</div>
</Story>

<Story name="Pending" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementRow requirement={displayed} pending />
	</div>
</Story>

<!--
	375px. The ATTESTED pill must not squeeze the statement — it forced the
	question into four narrow lines before the row dropped the statement to its
	own full-width line below `sm:`.
-->
<Story name="Phone width" asChild>
	<div class="w-[375px] bg-background p-4">{@render everyState()}</div>
</Story>
