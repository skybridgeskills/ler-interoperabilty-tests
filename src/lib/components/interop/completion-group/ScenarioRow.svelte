<script lang="ts">
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
	import { type CannotServe, cannotServeMessage } from '$lib/interop/scenarios/index.js';

	/**
	 * One obligation row inside a completion group: a leading status marker, the
	 * scenario name as a link, a trailing detail, and an arrow that is a second
	 * link to the same scenario.
	 *
	 * Purely presentational. `met`/`total` come from M4's `ObligationProgress` and
	 * are only displayed — this row counts nothing. Status comes from the record's
	 * own `status`, and the blocked state comes from the passed `blocked` reason.
	 * A blocked row is still shown (it counts in the denominator) and is never
	 * hidden.
	 */
	let {
		name,
		href,
		met,
		total,
		run,
		blocked
	}: {
		name: string;
		/** `scenarioHref(slug)` — passed in, never computed here. */
		href: string;
		met: number;
		total: number;
		/** The latest run for this scenario; absent means not run. */
		run?: ScenarioRunRecord;
		/** Present when the deployment cannot serve this scenario. */
		blocked?: CannotServe;
	} = $props();

	type Marker = { dot: string; glyph?: string };

	const marker = $derived<Marker>(
		blocked
			? { dot: 'border border-border bg-transparent' }
			: !run
				? { dot: 'border border-border bg-transparent' }
				: run.status === 'passed'
					? { dot: 'bg-result-pass', glyph: '✓' }
					: run.status === 'failed'
						? { dot: 'bg-result-fail', glyph: '✗' }
						: { dot: 'bg-muted-foreground/40' }
	);

	const detailTone = $derived(
		blocked || !run
			? 'text-muted-foreground'
			: run.status === 'passed'
				? 'text-result-pass'
				: run.status === 'failed'
					? 'text-result-fail'
					: 'text-muted-foreground'
	);

	const detail = $derived(
		blocked ? 'Unavailable here' : !run ? 'not run' : `${met}/${total} requirements met`
	);

	/** ISO date slice — a minimal last-run hint, no date library. */
	const ranOn = $derived(run?.ranAt ? run.ranAt.slice(0, 10) : undefined);
</script>

<div class="space-y-1" class:opacity-60={blocked}>
	<!--
		Below `sm:` the name drops to its own full-width line so the trailing detail
		cannot squeeze it; at `sm:` and up it is one inline row.
	-->
	<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:flex-nowrap">
		<span
			aria-hidden="true"
			class={`mt-1.5 flex size-4 shrink-0 items-center justify-center self-start rounded-full text-[0.625rem] leading-none text-result-pass-foreground ${marker.dot}`}
		>
			{marker.glyph ?? ''}
		</span>
		<a
			{href}
			class="order-last w-full text-body-md text-foreground underline-offset-2 hover:underline sm:order-none sm:w-auto sm:min-w-0 sm:flex-1"
		>
			{name}
		</a>
		<span
			class={`ml-auto shrink-0 text-label-md font-medium whitespace-nowrap sm:ml-0 ${detailTone}`}
		>
			{detail}
		</span>
		<!--
			A second link to the same place as the title, because the arrow at the end
			of a row reads as clickable and people click it. `tabindex="-1"` plus
			`aria-hidden` keep it a mouse affordance only: one destination should be
			one tab stop and one accessible name, and the title above already carries
			both. The `aria-hidden` is legitimate here precisely because the element
			is not keyboard-focusable.
		-->
		<a
			{href}
			tabindex="-1"
			aria-hidden="true"
			class="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
		>
			→
		</a>
	</div>

	{#if blocked}
		<p class="text-body-md text-muted-foreground">{cannotServeMessage(blocked)}</p>
	{:else if ranOn}
		<p class="text-label-md text-muted-foreground">Last run {ranOn}</p>
	{/if}
</div>
