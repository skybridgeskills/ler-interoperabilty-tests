<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { RunnableIssuerDirectIssuancePage } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableIssuerDirectIssuance',
		component: RunnableIssuerDirectIssuancePage
	});
</script>

<!--
	Idle state: the consolidated two-column runnable page — the OB3 Direct Delivery checklist on the
	left and the flame-orange paste-and-verify surface in the right column, with the applicable
	additive sections below. Run states are driven by `POST /api/issuer-runner/verify` (verified /
	not-verified / fatalError run summary + inline requirement lighting); the per-requirement pass /
	fail / warn / n-a / pending appearances are covered by the RequirementStatusRow component stories.
-->
<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableIssuerDirectIssuancePage />
	</div>
</Story>
