<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { RequirementOutcome } from '$lib/interop/scenario-run/index.js';

	import {
		answeredWrongly,
		autoPass,
		couldNotTell,
		displayed,
		exchangeComplete,
		handled,
		SETUP
	} from './fixtures.js';
	import ScenarioStepCard from './ScenarioStepCard.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Scenario Step/ScenarioStepCard',
		component: ScenarioStepCard
	});

	const requirements = [exchangeComplete, handled, displayed];
	const none: Record<string, RequirementOutcome> = {};
	const settled: Record<string, RequirementOutcome> = {
		'exchange-complete': autoPass,
		handled: answeredWrongly,
		displayed: {
			requirementId: 'displayed',
			level: 'SHOULD',
			status: 'pass',
			source: 'attested',
			answer: { kind: 'affirm', value: true },
			expected: { kind: 'affirm', value: true }
		}
	};
	const settledCantTell: Record<string, RequirementOutcome> = {
		'exchange-complete': autoPass,
		handled: { ...couldNotTell },
		displayed: {
			requirementId: 'displayed',
			level: 'SHOULD',
			status: 'pass',
			source: 'attested',
			answer: { kind: 'affirm', value: true },
			expected: { kind: 'affirm', value: true }
		}
	};
	/** The wire settled, so the automatic row is resolved while the questions are still open. */
	const liveOutcomes: Record<string, RequirementOutcome> = { 'exchange-complete': autoPass };
	const noop = () => {};
</script>

{#snippet actionSlot()}
	<div class="rounded-md border border-live-border bg-live-soft p-4">
		<p class="text-label-md text-live">Live · OID4VCI offer</p>
		<p class="mt-1 text-body-md text-foreground">The exchange runner panel goes here.</p>
	</div>
{/snippet}

{#snippet spine()}
	<ol class="max-w-2xl space-y-3">
		<ScenarioStepCard
			index={1}
			label="Credential 1"
			state="settled"
			setup={SETUP}
			{requirements}
			outcomes={settled}
		/>
		<ScenarioStepCard
			index={2}
			label="Credential 2"
			state="in-flight"
			setup={SETUP}
			{requirements}
			outcomes={liveOutcomes}
			onAnswer={noop}
			action={actionSlot}
		/>
		<ScenarioStepCard
			index={3}
			label="Credential 3"
			state="pending"
			setup={SETUP}
			{requirements}
			outcomes={none}
		/>
	</ol>
{/snippet}

<!-- The spine as an operator sees it mid-run: one settled, one live, one waiting. -->
<Story name="Spine — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">{@render spine()}</div>
		<div class="dark"><div class="bg-background p-6">{@render spine()}</div></div>
	</div>
</Story>

<Story name="Live" asChild>
	<div class="max-w-2xl bg-background p-6">
		<ol class="space-y-3">
			<ScenarioStepCard
				index={2}
				label="Credential 2"
				state="in-flight"
				setup={SETUP}
				{requirements}
				outcomes={liveOutcomes}
				onAnswer={noop}
				action={actionSlot}
			/>
		</ol>
	</div>
</Story>

<Story name="Settled — collapsed" asChild>
	<div class="max-w-2xl bg-background p-6">
		<ol class="space-y-3">
			<ScenarioStepCard
				index={1}
				label="Credential 1"
				state="settled"
				setup={SETUP}
				{requirements}
				outcomes={settled}
			/>
		</ol>
	</div>
</Story>

<!-- A step whose only blemish is `can't tell` says so, rather than reading as a miss. -->
<Story name="Settled — couldn’t tell" asChild>
	<div class="max-w-2xl bg-background p-6">
		<ol class="space-y-3">
			<ScenarioStepCard
				index={3}
				label="Credential 3"
				state="settled"
				setup={SETUP}
				{requirements}
				outcomes={settledCantTell}
			/>
		</ol>
	</div>
</Story>

<Story name="Pending" asChild>
	<div class="max-w-2xl bg-background p-6">
		<ol class="space-y-3">
			<ScenarioStepCard
				index={3}
				label="Credential 3"
				state="pending"
				setup={SETUP}
				{requirements}
				outcomes={none}
			/>
		</ol>
	</div>
</Story>

<!--
	An errored step's automatic requirements stay unresolved by design — we do not
	record a measurement we did not take — so its rows read `Waiting`, forever.
-->
<Story name="Errored" asChild>
	<div class="max-w-2xl bg-background p-6">
		<ol class="space-y-3">
			<ScenarioStepCard
				index={2}
				label="Credential 2"
				state="errored"
				setup={SETUP}
				{requirements}
				outcomes={none}
				error="The exchange could not be created. Is the transaction service running?"
			/>
		</ol>
	</div>
</Story>

<Story name="Phone width" asChild>
	<div class="w-[375px] bg-background p-4">{@render spine()}</div>
</Story>
