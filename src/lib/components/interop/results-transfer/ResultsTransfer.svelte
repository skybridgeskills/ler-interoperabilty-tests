<script lang="ts" module>
	import type { ImportOutcome } from '$lib/client/scenario-runs/index.js';

	export type ResultsTransferProps = {
		/** Serialise the stores and hand the browser a download. */
		onExport: () => void;
		/** Fold a chosen bundle file into the stores, reporting what it did. */
		onImport: (file: File) => Promise<ImportOutcome>;
		/** Called after a successful import so the parent can re-read the stores. */
		onImported?: () => void;
	};
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The homepage affordance for moving results between machines. Purely wiring:
	 * it owns a file picker and a status line, and delegates every decision to the
	 * `bundle-io` actions its parent passes in. Export downloads the store; import
	 * replaces per scenario with the incoming copy winning.
	 */
	let { onExport, onImport, onImported }: ResultsTransferProps = $props();

	let input = $state<HTMLInputElement>();
	let busy = $state(false);
	let status = $state<{ tone: 'ok' | 'error'; message: string }>();

	async function chooseFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;

		busy = true;
		status = undefined;
		const outcome = await onImport(file);
		busy = false;

		// Reset so choosing the same file again re-fires `change`.
		if (input) input.value = '';

		if (outcome.ok) {
			status = {
				tone: 'ok',
				message: `Imported ${outcome.scenarios} scenario ${
					outcome.scenarios === 1 ? 'result' : 'results'
				} and ${outcome.badges} badge ${outcome.badges === 1 ? 'claim' : 'claims'}.`
			};
			onImported?.();
		} else {
			status = { tone: 'error', message: outcome.error };
		}
	}
</script>

<section class="space-y-3 rounded-md border border-border bg-muted/40 p-4">
	<header class="space-y-1">
		<h3 class="text-title-lg text-foreground">Export / import results</h3>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Your results live in this browser. Export them to a file to back them up or move them to
			another machine; import a file to bring them back. Import replaces each scenario's result with
			the incoming one and leaves the rest untouched.
		</p>
	</header>

	<div class="flex flex-wrap gap-3">
		<Button variant="outline" size="sm" onclick={() => onExport()}>Export results</Button>
		<Button variant="outline" size="sm" disabled={busy} onclick={() => input?.click()}>
			{busy ? 'Importing…' : 'Import results'}
		</Button>
		<input
			bind:this={input}
			type="file"
			accept="application/json,.json"
			class="hidden"
			onchange={chooseFile}
		/>
	</div>

	{#if status}
		<p
			role="status"
			class={`text-body-sm ${status.tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
		>
			{status.message}
		</p>
	{/if}
</section>
