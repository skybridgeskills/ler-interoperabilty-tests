<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import { RequirementReport } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Issuer Runner/RequirementReport',
		component: RequirementReport
	});

	const passingReport: IssuerRunnerReport = {
		verified: true,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: 'ob3-direct-delivery',
					profileName: 'OB 3.0 Direct Delivery Profile',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				outcomes: [
					{
						id: 'ob3-direct-delivery.vc-data-model-v2-compliant',
						level: 'MUST',
						status: 'pass',
						message: 'VC Data Model 2.0 context and type present.'
					},
					{
						id: 'ob3-direct-delivery.openbadgecredential-type',
						level: 'MUST',
						status: 'pass',
						message: '`type` includes `OpenBadgeCredential`.'
					},
					{
						id: 'ob3-direct-delivery.valid-until-optional',
						level: 'SHOULD',
						status: 'n/a',
						message: '`validUntil` not set; credential does not declare an expiration.'
					}
				]
			}
		]
	};

	const mixedReport: IssuerRunnerReport = {
		verified: false,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: 'ob3-direct-delivery',
					profileName: 'OB 3.0 Direct Delivery Profile',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				outcomes: [
					{
						id: 'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022',
						level: 'MUST',
						status: 'fail',
						message: '`proof.cryptosuite` MUST be `eddsa-rdfc-2022`.'
					}
				]
			},
			{
				checklist: {
					kind: 'additive',
					profileSlug: 'open-skill-alignment',
					profileName: 'Open Skill Alignment',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				outcomes: [
					{
						id: 'open-skill-alignment.result-description.ctdl-alignment',
						level: 'SHOULD',
						status: 'warn',
						message:
							'1 alignment.targetUrl(s) outside the CTDL Credential Registry allowlist (hosts: other-registry.example.org).'
					}
				]
			}
		]
	};

	const fatalReport: IssuerRunnerReport = {
		verified: false,
		fatalError: {
			message: 'Pasted text is not valid JSON.',
			hint: 'Check for unbalanced braces or trailing commas.'
		},
		groups: []
	};
</script>

<Story name="Passing — base only" asChild>
	<div class="max-w-3xl bg-background p-6">
		<RequirementReport report={passingReport} />
	</div>
</Story>

<Story name="Mixed fail + warn" asChild>
	<div class="max-w-3xl bg-background p-6">
		<RequirementReport report={mixedReport} />
	</div>
</Story>

<Story name="Fatal — invalid JSON" asChild>
	<div class="max-w-3xl bg-background p-6">
		<RequirementReport report={fatalReport} />
	</div>
</Story>
