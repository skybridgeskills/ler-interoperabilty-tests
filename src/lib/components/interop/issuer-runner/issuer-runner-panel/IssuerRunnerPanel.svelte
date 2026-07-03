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
	<div class="space-y-4 rounded-md border border-live-border bg-live-soft p-5">
		<p class="text-label-md text-live">Built-in verifier</p>
		<h3 class="text-headline-md text-foreground">Verify a credential against the profile</h3>
		<p class="text-body-md text-foreground">
			Paste an OpenBadgeCredential JSON (or load a sample), choose which additive-profile
			requirements to include, and the suite checks it against the conformance requirements below.
		</p>

		<CredentialPasteForm
			value={data.credentialText}
			selectedAdditives={data.selectedAdditives}
			status={data.status}
			onChange={actions.onCredentialChange}
			onToggleAdditive={actions.onToggleAdditive}
			onLoadSample={actions.onLoadSample}
			onVerify={() => void actions.onVerify()}
		/>
	</div>

	{#if data.report}
		<RequirementReport report={data.report} />
	{/if}
</div>
