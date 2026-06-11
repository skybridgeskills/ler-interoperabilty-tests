<script lang="ts">
	import { RequirementReport } from '$lib/components/interop/issuer-runner/requirement-report/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	/**
	 * Server-side test-wallet runner panel. Renders the "Run test wallet"
	 * action and, once a run completes, the conformance report returned by
	 * `POST /api/wallet-runner/accept`.
	 *
	 * Purely presentational: the parent owns the run lifecycle (creating the
	 * exchange, calling the accept endpoint, recording history) and passes the
	 * resulting `report` plus a `busy` flag down here.
	 */
	let {
		report,
		busy = false,
		protocol = 'VCALM',
		onRun
	}: {
		/** Conformance report from the last completed run, if any. */
		report?: IssuerRunnerReport;
		/** True while a run is in flight (disables the action). */
		busy?: boolean;
		/** The protocol this runner drives (e.g. `VCALM`, `OID4VCI`) — used in copy. */
		protocol?: string;
		/** Kick off (or re-run) the test-wallet flow. */
		onRun: () => void | Promise<void>;
	} = $props();
</script>

<div class="space-y-4 rounded-md border border-live-border bg-live-soft p-5">
	<p class="text-label-md text-live">Built-in test wallet</p>
	<h3 class="text-headline-md text-foreground">Run the suite's test wallet</h3>
	<p class="text-body-md text-foreground">
		Drive the full {protocol} holder flow server-side — no external wallet needed — and check the issued
		credential against the conformance requirements.
	</p>
	<Button
		type="button"
		class="bg-live text-live-foreground hover:bg-live/90"
		disabled={busy}
		onclick={() => void onRun()}
	>
		{busy ? 'Running test wallet…' : report ? 'Run test wallet again' : 'Run test wallet'}
	</Button>
</div>

{#if report}
	<RequirementReport {report} />
{/if}
