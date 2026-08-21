<script lang="ts" module>
	export type DeliverableCredentialPanelProps = {
		/** The signed credential to hand over. Rendered as pretty JSON. */
		credential: unknown;
		/**
		 * The step's neutral, positional label ("Credential 1"). It is the download
		 * filename and the panel heading — **never** the pass kind or recipe id,
		 * which would reveal the concealed right answer before the operator judges.
		 */
		label: string;
	};
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The action panel a `deliver-direct` step renders: the signed credential the
	 * operator downloads (or copies) and hands to the system under test. No wire,
	 * no interaction URL — a file and two buttons.
	 */
	let { credential, label }: DeliverableCredentialPanelProps = $props();

	const json = $derived(JSON.stringify(credential, null, 2));
	const fileName = $derived(`${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);

	let copied = $state(false);

	function download() {
		if (typeof document === 'undefined' || typeof URL === 'undefined') return;
		const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = fileName;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	}

	async function copy() {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<section class="space-y-3 rounded-md border border-border bg-muted/40 p-4">
	<header class="space-y-1">
		<h3 class="text-title-md text-foreground">Hand this credential to your verifier</h3>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Download or copy this credential, feed it to the tool you are testing, then report below what
			it decided.
		</p>
	</header>

	<div class="flex flex-wrap gap-2">
		<Button variant="outline" size="sm" onclick={download}>Download {fileName}</Button>
		<Button variant="outline" size="sm" onclick={copy}>{copied ? 'Copied' : 'Copy JSON'}</Button>
	</div>

	<pre
		class="text-body-sm max-h-72 overflow-auto rounded-md border border-border bg-background p-3">{json}</pre>
</section>
