<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { RunnableVerifierVcalmPage } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableVerifierVcalm',
		component: RunnableVerifierVcalmPage
	});
</script>

<!--
	Idle state: the verifier VCALM checklist on the left (create-exchange + respond + VPR +
	receive-and-verify capability steps + the "Demonstrate verification outcomes" acceptance step)
	and the wallet-as-interlocutor surface on the right, with the "Interaction URL" initiation
	input, waiting on "Start verifying". The live run states are driven by
	`POST /api/verifier-runner/vcalm/{plan,present,score}`; the per-credential fresh-URL prompt
	(VC-API exchanges are single-use), transport-retry, reveal, and attested-row appearances are
	covered by the VerifierPassesWallet / PresentationRequestField / RequirementStatusRow component
	stories.
-->
<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableVerifierVcalmPage />
	</div>
</Story>
