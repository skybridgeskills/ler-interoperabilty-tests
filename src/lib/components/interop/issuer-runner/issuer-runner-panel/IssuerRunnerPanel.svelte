<script lang="ts">
	import { CredentialPasteForm } from '$lib/components/interop/issuer-runner/credential-paste-form/index.js';
	import { RequirementReport } from '$lib/components/interop/issuer-runner/requirement-report/index.js';

	import type {
		IssuerRunnerPanelActions,
		IssuerRunnerPanelData
	} from './issuer-runner-panel-types.js';

	let { data, actions }: { data: IssuerRunnerPanelData; actions: IssuerRunnerPanelActions } =
		$props();
</script>

<div class="space-y-8">
	<CredentialPasteForm
		value={data.credentialText}
		selectedAdditives={data.selectedAdditives}
		status={data.status}
		onChange={actions.onCredentialChange}
		onToggleAdditive={actions.onToggleAdditive}
		onLoadSample={actions.onLoadSample}
		onVerify={() => void actions.onVerify()}
	/>

	{#if data.report}
		<RequirementReport report={data.report} />
	{/if}
</div>
