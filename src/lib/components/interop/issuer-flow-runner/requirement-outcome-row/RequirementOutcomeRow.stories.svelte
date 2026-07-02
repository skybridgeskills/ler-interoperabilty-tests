<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

	import RequirementOutcomeRow from './RequirementOutcomeRow.svelte';

	const { Story } = defineMeta({
		title: 'Components/IssuerFlowRunner/RequirementOutcomeRow',
		component: RequirementOutcomeRow
	});

	const req = {
		id: 'vcalm.issuer.credential-issuance.tls',
		level: 'MUST' as const,
		text: 'Encrypt web-service endpoints with at least TLS 1.2.'
	};
	const shouldReq = {
		id: 'vcalm.issuer.credential-issuance.valid-until',
		level: 'SHOULD' as const,
		text: 'Support credential expiration via validUntil.'
	};

	const passOutcome: CheckOutcome = {
		id: req.id,
		level: 'MUST',
		status: 'pass',
		message: 'Endpoint negotiated TLSv1.3.'
	};
	const failOutcome: CheckOutcome = {
		id: req.id,
		level: 'MUST',
		status: 'fail',
		message: 'Endpoint is not served over HTTPS (TLS 1.2+ required).'
	};
	const warnOutcome: CheckOutcome = {
		id: shouldReq.id,
		level: 'SHOULD',
		status: 'warn',
		message: '`validUntil` is not set; the credential declares no expiration.'
	};
</script>

<Story name="Pending — step not run" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementOutcomeRow requirement={req} />
	</div>
</Story>

<Story name="Pass — with collapsible raw body" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementOutcomeRow
			requirement={req}
			outcome={passOutcome}
			raw={{ protocols: { vcapi: 'https://issuer.example/vcapi/ex-1' } }}
		/>
	</div>
</Story>

<Story name="Fail (MUST) — inline error" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementOutcomeRow requirement={req} outcome={failOutcome} raw={{ status: 200 }} />
	</div>
</Story>

<Story name="Warn (SHOULD)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementOutcomeRow requirement={shouldReq} outcome={warnOutcome} />
	</div>
</Story>
