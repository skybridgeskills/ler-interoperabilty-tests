<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { RunnableVerifierDirectDeliveryPage } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableVerifierDirectDelivery',
		component: RunnableVerifierDirectDeliveryPage
	});
</script>

<!--
	Idle state: the verifier OB3 Direct Delivery checklist on the left (capability steps +
	the "Demonstrate verification outcomes" acceptance step) and the wallet-as-interlocutor
	surface on the right, waiting on "Start verifying". The live run states are
	driven by `POST /api/verifier-runner/direct-delivery/{generate,score}`; the mid-run
	question, credential artifacts, reveal, and attested-row appearances are covered by the
	VerifierPassesWallet / PassArtifactCard / RequirementStatusRow component stories.
-->
<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableVerifierDirectDeliveryPage />
	</div>
</Story>
