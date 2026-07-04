<script lang="ts" module>
	/** The four terminal outcomes of a run, as seen by the overall verdict. */
	export type RunResultOutcome = 'verified' | 'not-verified' | 'stopped-early' | 'error';

	/** Props for {@link RunResultCard}. Presentational — the parent resolves the outcome. */
	export type RunResultCardProps = {
		/** The run outcome. When omitted the card renders nothing (no result yet). */
		outcome?: RunResultOutcome;
		/** Count of failed MUST requirements, used in the not-verified body. */
		failingMustCount?: number;
		/** Step index the flow stopped at, used in the stopped-early title/body. */
		stoppedAtStep?: number;
		/** Optional body override (e.g. an error message) in place of the default copy. */
		message?: string;
		/** Optional secondary hint line (e.g. how to fix an error). */
		hint?: string;
	};
</script>

<script lang="ts">
	import type { RequirementStatusView } from '$lib/components/interop/requirement-status-row/requirement-status-view.js';
	import { RunStatusIndicator } from '$lib/components/interop/run-status-indicator/index.js';

	/**
	 * The detailed overall-verdict card for a run, rendered in the right column **outside** the
	 * wallet box. It complements — not duplicates — the top-of-page "Run complete / Run failed"
	 * badge already shown by `RunnableChecklist`: the badge is the at-a-glance status, this card
	 * is the detail (failing-MUST count, stopped-at-step, error hint). It reuses the shared
	 * result-token language (`result-pass`/`result-fail`/`warning`) and the shared
	 * {@link RunStatusIndicator} for its status icon so it reads as one system with the checklist.
	 * Renders nothing until there is an `outcome`.
	 */
	let {
		outcome,
		failingMustCount = 0,
		stoppedAtStep,
		message,
		hint
	}: RunResultCardProps = $props();

	const statusView = $derived<RequirementStatusView | undefined>(
		outcome === 'verified'
			? { tone: 'pass', label: 'VERIFIED' }
			: outcome === 'stopped-early'
				? { tone: 'warn', label: 'STOPPED EARLY' }
				: outcome === 'not-verified'
					? { tone: 'fail', label: 'NOT VERIFIED' }
					: outcome === 'error'
						? { tone: 'fail', label: 'ERROR' }
						: undefined
	);

	const containerClass = $derived(
		outcome === 'verified'
			? 'border-result-pass-border bg-result-pass-soft'
			: outcome === 'stopped-early'
				? 'border-warning/40 bg-warning/10'
				: 'border-result-fail-border bg-result-fail-soft'
	);

	const title = $derived(
		outcome === 'verified'
			? 'Verified'
			: outcome === 'not-verified'
				? 'Not verified'
				: outcome === 'stopped-early'
					? `Stopped early${stoppedAtStep ? ` · step ${stoppedAtStep}` : ''}`
					: 'Run failed'
	);

	const body = $derived(
		message ??
			(outcome === 'verified'
				? 'The test wallet completed the whole flow and no MUST requirements failed.'
				: outcome === 'not-verified'
					? `${failingMustCount} MUST requirement${failingMustCount === 1 ? '' : 's'} failed. See the highlighted items in the checklist.`
					: outcome === 'stopped-early'
						? `The flow could not continue${stoppedAtStep ? ` past step ${stoppedAtStep}` : ''}. Requirements beyond that point stay pending — fix the failing item and run again.`
						: 'The run could not complete.')
	);
</script>

{#if outcome && statusView}
	<section class={`space-y-2 rounded-md border p-4 ${containerClass}`}>
		<div class="flex items-center justify-between gap-3">
			<h3 class="text-headline-sm text-foreground">{title}</h3>
			<RunStatusIndicator status={statusView} />
		</div>
		<p class="text-body-md text-foreground">{body}</p>
		{#if hint}
			<p class="text-label-md text-muted-foreground">{hint}</p>
		{/if}
	</section>
{/if}
