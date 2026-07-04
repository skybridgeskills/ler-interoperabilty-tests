<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { RunnableVerifierOid4Page } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableVerifierOid4',
		component: RunnableVerifierOid4Page
	});
</script>

<!--
	Idle state: the verifier OID4VP checklist on the left (create-request + receive-and-verify
	capability steps + the "Demonstrate verification outcomes" acceptance step) and the
	wallet-as-interlocutor surface on the right, with the "Presentation request" initiation input,
	waiting on "Start verifying". The live run states are driven by
	`POST /api/verifier-runner/oid4/{plan,inspect,present,score}`; the per-credential request prompt,
	transport-retry, reveal, and attested-row appearances are covered by the VerifierPassesWallet /
	PresentationRequestField / RequirementStatusRow component stories.
-->
<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-6">
		<RunnableVerifierOid4Page />
	</div>
</Story>
