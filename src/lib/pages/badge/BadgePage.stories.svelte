<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		claimedSnapshot,
		emptyResult,
		fullResult,
		serverProps,
		staleSnapshot
	} from './badge-fixture.js';
	import BadgePage from './BadgePage.svelte';

	/**
	 * The badge page serves three jobs from one route. The client overlay
	 * (completion + prior claim) is passed as props here so each state renders
	 * without a browser store or a live exchange.
	 */
	const { Story } = defineMeta({
		title: 'Interop/Badge/BadgePage',
		component: BadgePage
	});
</script>

<!-- 1. Stranger: no completion, no prior claim, no `?v=`. Criteria only, no claim control. -->
<Story name="Stranger — criteria only" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<BadgePage
			{...serverProps}
			versionMismatch={false}
			completion={emptyResult}
			priorClaim={null}
		/>
	</div>
</Story>

<!-- 2. Mismatch: a `?v=` that differs from the current fingerprint. The warning renders. -->
<Story name="Version mismatch" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<BadgePage {...serverProps} versionMismatch={true} completion={emptyResult} priorClaim={null} />
	</div>
</Story>

<!-- 3. Earned, unclaimed: the required set is full and there is no prior snapshot. -->
<Story name="Earned — unclaimed" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<BadgePage {...serverProps} versionMismatch={false} completion={fullResult} priorClaim={null} />
	</div>
</Story>

<!-- 4. Claimed: a prior snapshot, no drift — "Claimed 3 Aug against N requirements". -->
<Story name="Claimed" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<BadgePage
			{...serverProps}
			versionMismatch={false}
			completion={fullResult}
			priorClaim={claimedSnapshot}
		/>
	</div>
</Story>

<!-- 4b. Claimed against an older set — the "k new since" suffix. -->
<Story name="Claimed — k new since" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<BadgePage
			{...serverProps}
			versionMismatch={false}
			completion={fullResult}
			priorClaim={staleSnapshot}
		/>
	</div>
</Story>

<!-- 5. Claim failed: the driver's terminal error with a Retry; completion untouched. -->
<Story name="Claim failed" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<BadgePage
			{...serverProps}
			versionMismatch={false}
			completion={fullResult}
			priorClaim={null}
			claimErrorForStory={{
				message: 'The claim could not be delivered.',
				hint: 'Check the transaction service logs (`docker logs lits-transaction-service`).'
			}}
		/>
	</div>
</Story>

<!-- Phone width — the stranger criteria page must not overflow at 375px. -->
<Story name="Phone width — stranger" asChild>
	<div class="w-[375px] bg-background p-4">
		<BadgePage
			{...serverProps}
			versionMismatch={false}
			completion={emptyResult}
			priorClaim={null}
		/>
	</div>
</Story>
