<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { demoScenario, singleStepScenario, storedRun } from './scenario-fixture.js';
	import ScenarioPage from './ScenarioPage.svelte';
	import { stubExchangeApi, type StubBehaviour } from './stub-exchange-api.js';

	/**
	 * The page mints a real exchange on mount, so every live state needs the
	 * runner API stubbed. `beforeEach` installs it per story and its return value
	 * uninstalls it, so nothing leaks into the next story.
	 */
	const withApi = (behaviour: StubBehaviour) => () => stubExchangeApi(behaviour);

	const { Story } = defineMeta({
		title: 'Interop/Scenario/ScenarioPage',
		component: ScenarioPage,
		beforeEach: withApi({ kind: 'awaits' })
	});
</script>

<!--
	The exchange is minted and its link is up; the wallet has not answered yet.
	The step's questions are deliberately not answerable — automatic requirements
	must resolve first.
-->
<Story name="Live — awaiting the wallet" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage scenario={demoScenario} />
	</div>
</Story>

<!--
	The wire settled, so the automatic requirement is resolved and the questions
	are open. This is the teaching moment: "delivery completed ✓ — so was it
	stored?"
-->
<Story name="Live — settled, asking" asChild beforeEach={withApi({ kind: 'settles' })}>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage scenario={demoScenario} />
	</div>
</Story>

<!-- A single-action-step scenario, which is the only shape attach mode accepts. -->
<Story name="Attach — single action step" asChild beforeEach={withApi({ kind: 'settles' })}>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage scenario={singleStepScenario} attachExchangeId="attached-exchange-1" />
	</div>
</Story>

<!-- Attach declined: step 1 is chosen by the shuffle, so adopting into it leaks. -->
<Story name="Attach — declined, multi-step" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage scenario={demoScenario} attachExchangeId="attached-exchange-1" />
	</div>
</Story>

<!--
	The harness failed. The step's automatic requirements stay unresolved by
	design, so the run can never be recorded — and the only way on is Start over.
-->
<Story name="Errored step — the dead end" asChild beforeEach={withApi({ kind: 'create-fails' })}>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage scenario={demoScenario} />
	</div>
</Story>

<!-- A stored run re-renders read-only, reveals included, with a retry. -->
<Story name="Stored run" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage scenario={demoScenario} {storedRun} />
	</div>
</Story>

<!--
	Blocked before the operator tries anything — and the copy says the badge stays
	blocked rather than becoming easier to earn.
-->
<Story name="Blocked" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<ScenarioPage
			scenario={demoScenario}
			blocked={{
				kind: 'cryptosuite-unavailable',
				requested: 'bbs-2023',
				available: ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']
			}}
		/>
	</div>
</Story>

<Story name="Phone width — settled, asking" asChild beforeEach={withApi({ kind: 'settles' })}>
	<div class="w-[375px] bg-background p-4">
		<ScenarioPage scenario={demoScenario} />
	</div>
</Story>

<Story name="Phone width — stored run" asChild>
	<div class="w-[375px] bg-background p-4">
		<ScenarioPage scenario={demoScenario} {storedRun} />
	</div>
</Story>
