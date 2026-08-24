<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import CompletionGroup from './CompletionGroup.svelte';
	import {
		additiveSlice,
		blockedResult,
		blockedRuns,
		emptyResult,
		emptyRuns,
		fullResult,
		fullRuns,
		optionalResult,
		optionalRuns,
		partialResult,
		partialRuns,
		secondAdditiveSlice,
		twoTierFullResult,
		twoTierFullRuns
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
			claimHref="/badges/oid4-wallet-essential"
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
			claimHref="/badges/oid4-wallet-essential"
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

<!--
	Essential full, Expanded still in flight. Complete reads the CUMULATIVE totals
	and is therefore not claimable — under the old disjoint reading its claim
	would already be live.
-->
<Story name="Essential full · Complete not claimable" asChild>
	<div class="max-w-3xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={optionalResult}
			runs={optionalRuns}
			baseBadgeName="OID4 Wallet"
			expandedBadgeName="OID4 Wallet — Complete"
			claimHref="/badges/oid4-wallet-essential"
			expandedClaimHref="/badges/oid4-wallet-complete"
		/>
	</div>
</Story>

<!-- Both sets full — both badges claimable, base already claimed. -->
<Story name="Both tiers claimable" asChild>
	<div class="max-w-3xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={twoTierFullResult}
			runs={twoTierFullRuns}
			baseBadgeName="OID4 Wallet"
			expandedBadgeName="OID4 Wallet — Complete"
			claimHref="/badges/oid4-wallet-essential"
			expandedClaimHref="/badges/oid4-wallet-complete"
			claim={{ claimedAt: '2026-08-12T09:00:00.000Z', requirementCount: 4, newSince: 0 }}
		/>
	</div>
</Story>

<!-- Two-tier bundle in light + dark side by side. -->
<Story name="Light + dark" asChild>
	<div class="grid gap-4 xl:grid-cols-2">
		<div class="bg-background p-6">
			<CompletionGroup
				profileName="OID4 Profile"
				roleName="Wallet"
				result={optionalResult}
				runs={optionalRuns}
				baseBadgeName="OID4 Wallet"
				expandedBadgeName="OID4 Wallet — Complete"
				claimHref="/badges/oid4-wallet-essential"
				expandedClaimHref="/badges/oid4-wallet-complete"
			/>
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				<CompletionGroup
					profileName="OID4 Profile"
					roleName="Wallet"
					result={twoTierFullResult}
					runs={twoTierFullRuns}
					baseBadgeName="OID4 Wallet"
					expandedBadgeName="OID4 Wallet — Complete"
					claimHref="/badges/oid4-wallet-essential"
					expandedClaimHref="/badges/oid4-wallet-complete"
					claim={{ claimedAt: '2026-08-12T09:00:00.000Z', requirementCount: 4, newSince: 0 }}
				/>
			</div>
		</div>
	</div>
</Story>

<!--
	Three categories: Essential, Expanded, and one selected add-on. The add-on's
	6 requirements are absent from Complete's denominator and its row offers no
	claim — the card shows one base profile's slice of a badge that spans several.
-->
<Story name="With one add-on" asChild>
	<div class="max-w-3xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={optionalResult}
			runs={optionalRuns}
			additives={[additiveSlice]}
			baseBadgeName="OID4 Wallet"
			expandedBadgeName="OID4 Wallet — Complete"
			claimHref="/badges/oid4-wallet-essential"
			expandedClaimHref="/badges/oid4-wallet-complete"
		/>
	</div>
</Story>

<!-- Two selected add-ons — the stack the ordering has to survive. -->
<Story name="With two add-ons" asChild>
	<div class="max-w-3xl bg-background p-6">
		<CompletionGroup
			profileName="OID4 Profile"
			roleName="Wallet"
			result={optionalResult}
			runs={optionalRuns}
			additives={[secondAdditiveSlice, additiveSlice]}
			baseBadgeName="OID4 Wallet"
			expandedBadgeName="OID4 Wallet — Complete"
			claimHref="/badges/oid4-wallet-essential"
			expandedClaimHref="/badges/oid4-wallet-complete"
		/>
	</div>
</Story>

<!--
	An add-on selected on a profile-role with NO expanded set: no Complete tier at
	all, so Essential and the add-on render as siblings.
-->
<Story name="Add-on with no expanded set" asChild>
	<div class="max-w-3xl bg-background p-6">
		<CompletionGroup
			profileName="VCALM Profile"
			roleName="Verifier"
			result={partialResult}
			runs={partialRuns}
			additives={[additiveSlice]}
			baseBadgeName="VCALM Verifier"
			claimHref="/badges/oid4-wallet-essential"
		/>
	</div>
</Story>

<!-- The three-category card in light + dark. -->
<Story name="Add-on light + dark" asChild>
	<div class="grid gap-4 xl:grid-cols-2">
		<div class="bg-background p-6">
			<CompletionGroup
				profileName="OID4 Profile"
				roleName="Wallet"
				result={optionalResult}
				runs={optionalRuns}
				additives={[additiveSlice]}
				baseBadgeName="OID4 Wallet"
				expandedBadgeName="OID4 Wallet — Complete"
				claimHref="/badges/oid4-wallet-essential"
				expandedClaimHref="/badges/oid4-wallet-complete"
			/>
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				<CompletionGroup
					profileName="OID4 Profile"
					roleName="Wallet"
					result={optionalResult}
					runs={optionalRuns}
					additives={[additiveSlice]}
					baseBadgeName="OID4 Wallet"
					expandedBadgeName="OID4 Wallet — Complete"
					claimHref="/badges/oid4-wallet-essential"
					expandedClaimHref="/badges/oid4-wallet-complete"
				/>
			</div>
		</div>
	</div>
</Story>

<!--
	An ADD-ON card, as the additive's own page renders it since M15: one card per
	(base profile, role), single-tier, claiming the add-on badge for that triple
	rather than the base profile's Essential badge. `additives` is empty — nesting
	slices inside an add-on card would list the same scenarios twice.
-->
<Story name="Add-on card (additive page)" asChild>
	<div class="max-w-2xl bg-background p-6">
		<CompletionGroup
			profileName="VCALM Profile"
			roleName="Wallet"
			result={fullResult}
			runs={fullRuns}
			claimHref="/badges/data-integrity-cryptosuites-vcalm-wallet"
			baseBadgeName="Data Integrity Cryptosuites — VCALM Wallet"
		/>
	</div>
</Story>
