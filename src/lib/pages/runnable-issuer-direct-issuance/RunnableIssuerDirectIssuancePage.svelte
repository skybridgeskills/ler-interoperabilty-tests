<script lang="ts">
	import { onMount } from 'svelte';

	import { recordRun } from '$lib/client/run-history/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { IssuerRunnerPanel } from '$lib/components/interop/issuer-runner/issuer-runner-panel/index.js';
	import type { IssuerRunnerStatus } from '$lib/components/interop/issuer-runner/issuer-runner-panel/index.js';
	import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
	import {
		sampleCredentialsByResultType,
		type SampleResultType
	} from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
	import { issuerReportRunRecord } from '$lib/interop/index.js';
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	/** Number of failed MUST outcomes across all groups (mirrors RequirementReport). */
	function failingMustCount(r: IssuerRunnerReport): number {
		return r.groups
			.flatMap((g) => g.outcomes)
			.filter((o) => o.level === 'MUST' && o.status === 'fail').length;
	}

	let credentialText = $state<string>('');
	const selectedAdditives = $derived([...selectionStore.additiveProfiles]);
	let status = $state<IssuerRunnerStatus>('idle');
	let report = $state<IssuerRunnerReport | undefined>(undefined);

	onMount(() => {
		selectionStore.hydrate();
	});

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
				body: JSON.stringify({ credential: parsed, additiveProfiles: selectedAdditives })
			});
			const result = (await res.json()) as IssuerRunnerReport;
			report = result;
			status = res.ok ? 'done' : 'error';
			// Record this completed verification (passed iff verified and no fatalError).
			recordRun(
				issuerReportRunRecord({
					role: 'issuer',
					workflow: 'direct-credential-issuance',
					profile: 'ob3-direct-delivery',
					verified: result.verified,
					failingMustCount: failingMustCount(result),
					fatalError: result.fatalError
				})
			);
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

	function onToggleAdditive(slug: AdditiveProfileSlug) {
		selectionStore.toggleAdditiveProfile(slug);
	}
</script>

<section class="space-y-6">
	<header class="space-y-3">
		<p class="text-label-md text-primary uppercase">Issuer · Direct Credential Issuance · Run</p>
		<h1 class="text-display-md text-foreground">OB 3.0 Direct Delivery — Issuer Self-Test</h1>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Paste an OpenBadgeCredential you've delivered, and the suite will run
			<code>@digitalcredentials/verifier-core</code>
			plus structural conformance checks against the OB 3.0 Direct Delivery issuer checklist. Toggle an
			additive profile to additionally test its requirements against the same credential.
		</p>
	</header>

	<IssuerRunnerPanel
		data={{ credentialText, selectedAdditives, status, report }}
		actions={{
			onCredentialChange,
			onToggleAdditive,
			onLoadSample: loadSample,
			onVerify: verify
		}}
	/>
</section>
