<script lang="ts">
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import IdCardIcon from '@lucide/svelte/icons/id-card';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';

	import type { PassArtifactView } from './pass-artifact-view.js';

	/**
	 * One acceptance-pass credential in the wallet's artifact list: opaque title
	 * ("Credential 2") until the reveal, always with **Copy JSON** + **Download**
	 * actions so the operator can hand the credential to their verifier. The
	 * verified/unverified chip only appears once `verified` is defined
	 * (post-reveal) — before that the card stays deliberately neutral. Styling
	 * mirrors `WalletArtifactCard` so both read as the same credential row.
	 */
	let { pass }: { pass: PassArtifactView } = $props();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyJson() {
		await navigator.clipboard.writeText(pass.json);
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 2000);
	}

	const downloadHref = $derived(
		`data:application/json;charset=utf-8,${encodeURIComponent(pass.json)}`
	);
</script>

<Card class="gap-0 border-live-border/60 bg-card/60 p-4">
	<div class="flex items-start justify-between gap-3">
		<span class="inline-flex min-w-0 items-start gap-2">
			<IdCardIcon aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<span class="min-w-0 space-y-0.5">
				<span class="block text-body-md font-medium break-words text-foreground">{pass.title}</span>
				{#if pass.note}
					<span class="block text-label-md break-words text-muted-foreground">{pass.note}</span>
				{/if}
			</span>
		</span>
		{#if pass.verified === true}
			<span
				class="inline-flex shrink-0 items-center gap-1 rounded-full bg-result-pass-soft px-2 py-0.5 text-label-md text-result-pass"
			>
				<BadgeCheckIcon aria-hidden="true" class="size-3.5" />
				Verified
			</span>
		{:else if pass.verified === false}
			<span
				class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-md text-warning"
			>
				<ShieldAlertIcon aria-hidden="true" class="size-3.5" />
				Unverified
			</span>
		{/if}
	</div>

	<div class="mt-3 flex flex-wrap gap-2">
		<Button type="button" variant="outline" size="sm" onclick={() => void copyJson()}>
			{#if copied}
				<CheckIcon aria-hidden="true" class="size-3.5" />
				Copied
			{:else}
				<CopyIcon aria-hidden="true" class="size-3.5" />
				Copy JSON
			{/if}
		</Button>
		<Button href={downloadHref} download={pass.fileName} variant="outline" size="sm">
			<DownloadIcon aria-hidden="true" class="size-3.5" />
			Download .json
		</Button>
	</div>
</Card>
