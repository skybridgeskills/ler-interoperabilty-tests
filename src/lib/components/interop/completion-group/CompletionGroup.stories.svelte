<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import CompletionGroup from './CompletionGroup.svelte';
	import {
		blockedResult,
		blockedRuns,
		emptyResult,
		emptyRuns,
		fullResult,
		fullRuns,
		optionalResult,
		optionalRuns,
		partialResult,
		partialRuns
	} from './fixtures.js';

	const { Story } = defineMeta({
		title: 'Interop/Completion Group/CompletionGroup',
		component: CompletionGroup
	});
</script>

<Story name="Empty (nothing run)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={emptyResult}
			runs={emptyRuns}
		/>
	</div>
</Story>

<Story name="Partial (some passed, some not)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={partialResult}
			runs={partialRuns}
		/>
	</div>
</Story>

<Story name="Full (badge ready)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={fullResult}
			runs={fullRuns}
		/>
	</div>
</Story>

<!-- Full set with a registered badge — the claim control links to `/badges/[slug]`. -->
<Story name="Full — claimable (badge wired)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={fullResult}
			runs={fullRuns}
			claimHref="/badges/oid4-wallet"
		/>
	</div>
</Story>

<!-- Already claimed, with two requirements added to the set since — "k new since". -->
<Story name="Claimed — k new since" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={fullResult}
			runs={fullRuns}
			claimHref="/badges/oid4-wallet"
			claim={{ claimedAt: '2026-08-03T09:00:00.000Z', requirementCount: 11, newSince: 2 }}
		/>
	</div>
</Story>

<Story name="Blocked member" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={blockedResult}
			runs={blockedRuns}
		/>
	</div>
</Story>

<Story name="Optional sub-section" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={optionalResult}
			runs={optionalRuns}
		/>
	</div>
</Story>

<!-- Partial + optional in light + dark side by side. -->
<Story name="Light + dark" asChild>
	<div class="grid gap-4 xl:grid-cols-2">
		<div class="bg-background p-6">
			<CompletionGroup
				profileName="OID4 Profile"
				roleName="Wallet"
				result={partialResult}
				runs={partialRuns}
			/>
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				<CompletionGroup
					profileName="OID4 Profile"
					roleName="Wallet"
					result={optionalResult}
					runs={optionalRuns}
				/>
			</div>
		</div>
	</div>
</Story>
