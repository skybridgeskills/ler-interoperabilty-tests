<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { directEvidence, oid4MissEvidence, truncatedEvidence } from './fixtures.js';
	import StepDetails from './StepDetails.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Scenario Step/StepDetails',
		component: StepDetails
	});
</script>

<!--
	The case this panel exists for. Before it, a 500 from the operator's issuer was
	a dead end: the suite knew the status and dropped the body. Open the last
	stage's "Response body" and the reason is right there.
-->
<Story name="OID4VCI — a 500 on the credential request" asChild>
	<div class="max-w-2xl bg-background p-6">
		<StepDetails evidence={oid4MissEvidence} />
	</div>
</Story>

<!--
	A body over the display cap. It must SAY it was cut, and by how much — a body
	that silently ends mid-JSON reads as a broken response rather than a truncated
	one. Truncation is display-only: the summary above it was computed from the
	full body server-side, so nothing scored is affected.
-->
<Story name="A truncated response body" asChild>
	<div class="max-w-2xl bg-background p-6">
		<StepDetails evidence={truncatedEvidence} />
	</div>
</Story>

<!--
	The `direct` intake has no wire, so there is no trace at all — and the panel is
	still useful, because the summary and the received credential are evidence.
-->
<Story name="Direct delivery — no wire, still worth showing" asChild>
	<div class="max-w-2xl bg-background p-6">
		<StepDetails evidence={directEvidence} />
	</div>
</Story>

<!--
	A pure question step observed nothing, and a stored run persists no evidence.
	Both must render NOTHING rather than an empty disclosure — the box below should
	be blank.
-->
<Story name="Nothing to show — renders no disclosure" asChild>
	<div class="max-w-2xl bg-background p-6">
		<div class="rounded border border-dashed border-border p-4">
			<StepDetails />
			<p class="text-label-md text-muted-foreground">
				(This dashed box should contain no “Details” control.)
			</p>
		</div>
	</div>
</Story>
