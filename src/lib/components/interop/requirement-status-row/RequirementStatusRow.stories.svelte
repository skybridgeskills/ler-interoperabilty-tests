<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

	import {
		outcomeToRequirementStatus,
		stepStateToRequirementStatus
	} from './requirement-status-view.js';
	import RequirementStatusRow from './RequirementStatusRow.svelte';

	const { Story } = defineMeta({
		title: 'Interop/RequirementStatusRow',
		component: RequirementStatusRow
	});

	const mustReq = {
		level: 'MUST' as const,
		text: 'Encrypt web-service endpoints with at least TLS 1.2.'
	};
	const shouldReq = {
		level: 'SHOULD' as const,
		text: 'Support credential expiration via validUntil.'
	};

	const passOutcome: CheckOutcome = {
		id: 'vcalm.issuer.credential-issuance.tls',
		level: 'MUST',
		status: 'pass',
		message: 'Endpoint negotiated TLSv1.3.'
	};
	const failOutcome: CheckOutcome = {
		id: 'vcalm.issuer.credential-issuance.tls',
		level: 'MUST',
		status: 'fail',
		message: 'Endpoint is not served over HTTPS (TLS 1.2+ required).'
	};
	const advisoryFailOutcome: CheckOutcome = {
		id: 'vcalm.issuer.credential-issuance.valid-until',
		level: 'SHOULD',
		status: 'fail',
		message: '`validUntil` is present but not a valid ISO date string.'
	};
	const warnOutcome: CheckOutcome = {
		id: 'vcalm.issuer.credential-issuance.valid-until',
		level: 'SHOULD',
		status: 'warn',
		message: '`validUntil` is not set; the credential declares no expiration.'
	};
	const naOutcome: CheckOutcome = {
		id: 'vcalm.issuer.credential-issuance.participation-problemdetails',
		level: 'SHOULD',
		status: 'n/a',
		message: 'ProblemDetails error handling is not automatically checked on the happy path.'
	};
</script>

<!--
	All tones in one view for the UX gate. Blue appears only on the level badge; results read green
	(pass) / red (MUST fail) / amber (warn + advisory SHOULD/MAY fail) / warm orange (in-flight) /
	neutral (pending hollow ring, n-a, skipped). Toggle the Storybook theme to check light + dark.
-->
<Story name="All states" asChild>
	<div class="max-w-2xl space-y-3 bg-background p-6">
		<RequirementStatusRow requirement={mustReq} status={outcomeToRequirementStatus(passOutcome)} />
		<RequirementStatusRow requirement={mustReq} status={outcomeToRequirementStatus(failOutcome)} />
		<RequirementStatusRow
			requirement={shouldReq}
			status={outcomeToRequirementStatus(advisoryFailOutcome)}
		/>
		<RequirementStatusRow
			requirement={shouldReq}
			status={outcomeToRequirementStatus(warnOutcome)}
		/>
		<RequirementStatusRow requirement={shouldReq} status={outcomeToRequirementStatus(naOutcome)} />
		<RequirementStatusRow requirement={mustReq} status={outcomeToRequirementStatus(undefined)} />
		<RequirementStatusRow
			requirement={mustReq}
			status={stepStateToRequirementStatus('in-flight', {
				message: 'The wallet is working through this step of the exchange.'
			})}
		/>
		<RequirementStatusRow requirement={mustReq} status={stepStateToRequirementStatus('complete')} />
		<RequirementStatusRow requirement={mustReq} status={stepStateToRequirementStatus('skipped')} />
	</div>
</Story>

<Story name="Pending — step not run" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow requirement={mustReq} status={outcomeToRequirementStatus(undefined)} />
	</div>
</Story>

<Story name="Pass — with collapsible raw body" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow
			requirement={mustReq}
			status={outcomeToRequirementStatus(passOutcome, {
				protocols: { vcapi: 'https://issuer.example/vcapi/ex-1' }
			})}
		/>
	</div>
</Story>

<Story name="Fail (MUST) — inline error" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow
			requirement={mustReq}
			status={outcomeToRequirementStatus(failOutcome, { status: 200 })}
		/>
	</div>
</Story>

<Story name="Fail (SHOULD) — advisory (amber)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow
			requirement={shouldReq}
			status={outcomeToRequirementStatus(advisoryFailOutcome)}
		/>
	</div>
</Story>

<Story name="Warn (SHOULD)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow
			requirement={shouldReq}
			status={outcomeToRequirementStatus(warnOutcome)}
		/>
	</div>
</Story>

<Story name="N/A" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow requirement={shouldReq} status={outcomeToRequirementStatus(naOutcome)} />
	</div>
</Story>

<Story name="In progress — step derived (wallet)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow
			requirement={mustReq}
			status={stepStateToRequirementStatus('in-flight', {
				message: 'The wallet is working through this step of the exchange.'
			})}
		/>
	</div>
</Story>

<Story name="Done — step derived (wallet)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow requirement={mustReq} status={stepStateToRequirementStatus('complete')} />
	</div>
</Story>

<Story name="Skipped — run errored (wallet)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<RequirementStatusRow
			requirement={mustReq}
			status={stepStateToRequirementStatus('skipped', {
				message: 'The run errored before reaching this step.'
			})}
		/>
	</div>
</Story>
