<script lang="ts">
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import IdCardIcon from '@lucide/svelte/icons/id-card';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';

	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Card } from '$lib/components/ui/card/index.js';

	import type { WalletArtifact } from '../test-wallet-types.js';

	/**
	 * One credential summary card — the wallet's "credential row" from the reference
	 * screenshots: title, issuer, issuance date, type badges and a verified indicator.
	 * The verified state reuses the `result-pass` / `success` tokens; unverified is a quiet
	 * `warning`. No new colors.
	 */
	let { artifact }: { artifact: WalletArtifact } = $props();
</script>

<Card class="gap-0 border-live-border/60 bg-card/60 p-4">
	<div class="flex items-start justify-between gap-3">
		<span class="inline-flex min-w-0 items-start gap-2">
			<IdCardIcon aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<span class="min-w-0 space-y-0.5">
				<span class="block text-body-md font-medium break-words text-foreground"
					>{artifact.title}</span
				>
				{#if artifact.issuer}
					<span class="block text-label-md break-words text-muted-foreground"
						>Issued by {artifact.issuer}</span
					>
				{/if}
			</span>
		</span>
		{#if artifact.verified}
			<span
				class="inline-flex shrink-0 items-center gap-1 rounded-full bg-result-pass-soft px-2 py-0.5 text-label-md text-result-pass"
			>
				<BadgeCheckIcon aria-hidden="true" class="size-3.5" />
				Verified
			</span>
		{:else}
			<span
				class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-md text-warning"
			>
				<ShieldAlertIcon aria-hidden="true" class="size-3.5" />
				Unverified
			</span>
		{/if}
	</div>

	{#if artifact.issuanceDate || (artifact.types && artifact.types.length > 0)}
		<div class="mt-3 flex flex-wrap items-center gap-2">
			{#if artifact.types}
				{#each artifact.types as type (type)}
					<Badge variant="outline">{type}</Badge>
				{/each}
			{/if}
			{#if artifact.issuanceDate}
				<span class="text-label-md text-muted-foreground">Issued {artifact.issuanceDate}</span>
			{/if}
		</div>
	{/if}
</Card>
