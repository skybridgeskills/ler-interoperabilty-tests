<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	type Cryptosuite = 'eddsa-rdfc-2022' | 'ecdsa-rdfc-2019';

	/**
	 * Orange `live` "test runner" panel for the runnable issuer pages (same design language as
	 * `ExchangeRunnerPanel` / `PresentPanel`). Owns the primary starting action — a URL input +
	 * submit — plus a holder-cryptosuite selector and the run status (success / not-verified /
	 * stopped-early / error). Purely presentational: the parent owns the run
	 * lifecycle and passes state down; `interactionUrl` and `cryptosuite` are bindable. Copy
	 * (`title` / `blurb` / `inputLabel` / `inputPlaceholder` / `inputType` / `verifiedCopy`) is
	 * parametrized with VCALM defaults so the OID4 page can pass OID4VCI wording.
	 */
	let {
		interactionUrl = $bindable(''),
		cryptosuite = $bindable('eddsa-rdfc-2022'),
		busy = false,
		done = false,
		blocked = false,
		stoppedAtStep,
		verified = false,
		failingMustCount = 0,
		error,
		title = 'Run the test wallet against your issuer',
		blurb = 'Paste the interaction URL you generated on your issuer. The test wallet participates as the holder — fetching the exchange, authenticating with a DID, and receiving the credential — then lights up each requirement below with a pass, fail, or warning.',
		inputLabel = 'Interaction URL',
		inputPlaceholder = 'https://issuer.example/exchanges/…',
		inputType = 'url',
		verifiedCopy = 'The test wallet completed the whole VCALM issuance flow and no MUST requirements failed.',
		onRun,
		onReset
	}: {
		interactionUrl?: string;
		cryptosuite?: Cryptosuite;
		busy?: boolean;
		done?: boolean;
		blocked?: boolean;
		stoppedAtStep?: number;
		verified?: boolean;
		failingMustCount?: number;
		error?: { message: string; hint?: string };
		title?: string;
		blurb?: string;
		inputLabel?: string;
		inputPlaceholder?: string;
		inputType?: 'url' | 'text';
		verifiedCopy?: string;
		onRun: () => void | Promise<void>;
		onReset: () => void;
	} = $props();

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		void onRun();
	}
</script>

<div class="space-y-4 rounded-md border border-live-border bg-live-soft p-5">
	<p class="text-label-md text-live uppercase">Test wallet</p>
	<h3 class="text-headline-md text-foreground">{title}</h3>
	<p class="text-body-md text-foreground">{blurb}</p>

	<form class="space-y-3" onsubmit={handleSubmit}>
		<label class="block space-y-1">
			<span class="text-label-md text-foreground"
				>{inputLabel} <span class="text-muted-foreground">(step 1)</span></span
			>
			<Input
				type={inputType}
				bind:value={interactionUrl}
				disabled={busy}
				placeholder={inputPlaceholder}
				autocomplete="off"
			/>
		</label>
		<label class="block space-y-1">
			<span class="text-label-md text-muted-foreground">Holder cryptosuite</span>
			<select
				bind:value={cryptosuite}
				disabled={busy}
				class="h-9 w-full rounded-md border border-border bg-card px-3 text-body-md text-foreground"
			>
				<option value="eddsa-rdfc-2022">eddsa-rdfc-2022 (Ed25519)</option>
				<option value="ecdsa-rdfc-2019">ecdsa-rdfc-2019 (P-256)</option>
			</select>
		</label>
		<div class="flex flex-wrap gap-2">
			<Button
				type="submit"
				class="bg-live text-live-foreground hover:bg-live/90"
				disabled={busy || !interactionUrl.trim()}
			>
				{busy ? 'Running test wallet…' : done ? 'Run again' : 'Run test wallet'}
			</Button>
			{#if done || error}
				<Button type="button" variant="outline" onclick={onReset} disabled={busy}>Reset</Button>
			{/if}
		</div>
	</form>

	{#if error}
		<div class="rounded-md border border-destructive/40 bg-destructive/10 p-3">
			<p class="text-label-md text-destructive uppercase">Run failed</p>
			<p class="mt-1 text-body-md text-foreground">{error.message}</p>
			{#if error.hint}
				<p class="mt-1 text-label-md text-muted-foreground">{error.hint}</p>
			{/if}
		</div>
	{:else if done && blocked}
		<div class="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
			<p class="text-label-md text-amber-500 uppercase">
				Stopped early{stoppedAtStep ? ` · step ${stoppedAtStep}` : ''}
			</p>
			<p class="mt-1 text-body-md text-foreground">
				The flow could not continue{stoppedAtStep ? ` past step ${stoppedAtStep}` : ''}.
				Requirements beyond that point stay pending — fix the failing item above and run again.
			</p>
		</div>
	{:else if done && verified}
		<div class="rounded-md border border-success/40 bg-success/10 p-3">
			<p class="text-label-md text-success uppercase">Verified</p>
			<p class="mt-1 text-body-md text-foreground">{verifiedCopy}</p>
		</div>
	{:else if done}
		<div class="rounded-md border border-destructive/40 bg-destructive/10 p-3">
			<p class="text-label-md text-destructive uppercase">Not verified</p>
			<p class="mt-1 text-body-md text-foreground">
				{failingMustCount} MUST requirement{failingMustCount === 1 ? '' : 's'} failed. See the highlighted
				items in the checklist.
			</p>
		</div>
	{/if}
</div>
