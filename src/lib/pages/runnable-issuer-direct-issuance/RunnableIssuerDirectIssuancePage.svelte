<script lang="ts">
	import { IssuerRunnerPanel } from '$lib/components/interop/issuer-runner/issuer-runner-panel/index.js';
	import type { IssuerRunnerStatus } from '$lib/components/interop/issuer-runner/issuer-runner-panel/index.js';
	import {
		sampleCredentialsByResultType,
		type SampleResultType
	} from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	let credentialText = $state<string>('');
	let includeAdditive = $state<boolean>(false);
	let status = $state<IssuerRunnerStatus>('idle');
	let report = $state<IssuerRunnerReport | undefined>(undefined);

	async function verify() {
		let parsed: unknown;
		try {
			parsed = JSON.parse(credentialText);
		} catch (e) {
			report = {
				verified: false,
				fatalError: {
					message: 'Pasted text is not valid JSON.',
					hint: e instanceof Error ? e.message : undefined
				},
				groups: []
			};
			status = 'done';
			return;
		}
		status = 'running';
		try {
			const res = await fetch('/api/issuer-runner/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ credential: parsed, includeAdditive })
			});
			report = (await res.json()) as IssuerRunnerReport;
			status = res.ok ? 'done' : 'error';
		} catch (e) {
			report = {
				verified: false,
				fatalError: { message: e instanceof Error ? e.message : String(e) },
				groups: []
			};
			status = 'error';
		}
	}

	function loadSample(resultType: SampleResultType) {
		credentialText = JSON.stringify(sampleCredentialsByResultType[resultType], null, 2);
		report = undefined;
		status = 'idle';
	}

	function onCredentialChange(next: string) {
		credentialText = next;
		// Don't auto-clear the report — let the user keep the prior result visible
		// until they re-Verify.
	}

	function onToggleAdditive(next: boolean) {
		includeAdditive = next;
	}
</script>

<section class="space-y-6">
	<header class="space-y-3">
		<p class="text-label-md text-primary uppercase">Issuer · Direct Credential Issuance · Run</p>
		<h1 class="text-display-md text-foreground">OB 3.0 Direct Delivery — Issuer Self-Test</h1>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Paste an OpenBadgeCredential you've delivered, and the suite will run
			<code>@digitalcredentials/verifier-core</code>
			plus structural conformance checks against the OB 3.0 Direct Delivery issuer checklist. Toggle "Include
			open skill alignment requirements" to additionally test the open-skill-alignment additive profile.
		</p>
	</header>

	<IssuerRunnerPanel
		data={{ credentialText, includeAdditive, status, report }}
		actions={{
			onCredentialChange,
			onToggleAdditive,
			onLoadSample: loadSample,
			onVerify: verify
		}}
	/>
</section>
