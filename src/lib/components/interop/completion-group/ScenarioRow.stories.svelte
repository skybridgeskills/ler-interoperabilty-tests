<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { CannotServe } from '$lib/interop/scenarios/index.js';

	import { runRecord } from './fixtures.js';
	import ScenarioRow from './ScenarioRow.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Completion Group/ScenarioRow',
		component: ScenarioRow
	});

	const blocked: CannotServe = {
		kind: 'cryptosuite-unavailable',
		requested: 'ecdsa-sd-2023',
		available: ['bbs-2023', 'eddsa-rdfc-2022']
	};

	const href = '/scenarios/oid4-wallet-acceptance';
</script>

{#snippet allStates()}
	<div class="max-w-lg space-y-3">
		<ScenarioRow name="Present a credential on request" {href} met={0} total={6} />
		<ScenarioRow
			name="Accept a well-formed credential"
			{href}
			met={4}
			total={4}
			run={runRecord('oid4-wallet-acceptance', 'passed')}
		/>
		<ScenarioRow
			name="Tell a good credential from a bad one"
			{href}
			met={5}
			total={9}
			run={runRecord('oid4-wallet-refusal-discrimination', 'failed')}
		/>
		<ScenarioRow name="Issue with a pinned cryptosuite" {href} met={0} total={5} {blocked} />
	</div>
{/snippet}

<Story name="Not run" asChild>
	<div class="max-w-lg bg-background p-6">
		<ScenarioRow name="Present a credential on request" {href} met={0} total={6} />
	</div>
</Story>

<Story name="Passed (full)" asChild>
	<div class="max-w-lg bg-background p-6">
		<ScenarioRow
			name="Accept a well-formed credential"
			{href}
			met={4}
			total={4}
			run={runRecord('oid4-wallet-acceptance', 'passed')}
		/>
	</div>
</Story>

<Story name="Failed (partial)" asChild>
	<div class="max-w-lg bg-background p-6">
		<ScenarioRow
			name="Tell a good credential from a bad one"
			{href}
			met={5}
			total={9}
			run={runRecord('oid4-wallet-refusal-discrimination', 'failed')}
		/>
	</div>
</Story>

<Story name="Blocked (unavailable here)" asChild>
	<div class="max-w-lg bg-background p-6">
		<ScenarioRow name="Issue with a pinned cryptosuite" {href} met={0} total={5} {blocked} />
	</div>
</Story>

<!-- Every state in light + dark side by side. -->
<Story name="All states — light + dark" asChild>
	<div class="grid gap-4 lg:grid-cols-2">
		<div class="bg-background p-6">
			{@render allStates()}
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				{@render allStates()}
			</div>
		</div>
	</div>
</Story>
