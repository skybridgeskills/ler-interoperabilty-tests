<script lang="ts">
	import type { StepEvidence, TraceStage } from '$lib/interop/scenario-run/index.js';

	/**
	 * What a step's transport actually did — the collapsed **Details** disclosure
	 * at the foot of a step card.
	 *
	 * **Step-level, not per-requirement.** The legacy pages this replaces hung
	 * a `Details` disclosure off every requirement, with each page hand-mapping a
	 * requirement id to a slice of the run payload. That does not port: checks in
	 * the scenario model are pure functions over one step's evidence and there are
	 * 40+ of them, so a check → slice registry would have to be maintained against
	 * every one of them; and the issuer scenarios are single-step, so
	 * `oid4-issuer-issuance` would render fifteen identical panels. Evidence is
	 * step-scoped, so the panel is too.
	 *
	 * **It shows; it never scores.** Nothing here is read by a check — the trace
	 * is display-only, which is what makes truncating an oversized body safe.
	 *
	 * **Live-only.** Evidence lives on the run state, never on
	 * `ScenarioRunRecord`, so a reopened stored run resolves to no evidence and
	 * this renders nothing. That is deliberate, not a gap: a stored run is a list
	 * of outcomes, not a packet capture.
	 *
	 * Purely presentational. It renders nothing at all when there is nothing worth
	 * showing, so a pure question step never grows an empty disclosure.
	 */
	let { evidence }: { evidence?: StepEvidence } = $props();

	const stages = $derived<TraceStage[]>(evidence?.trace?.stages ?? []);
	/** Whichever transport summary this step produced — one or the other, never both. */
	const observed = $derived(evidence?.issuerFlow ?? evidence?.verifierRequest);
	const artifact = $derived(evidence?.artifact);
	/** Shown only for a step whose wire is an exchange we drove and that has no trace. */
	const exchange = $derived(stages.length === 0 ? evidence?.exchange : undefined);

	const hasDetails = $derived(
		stages.length > 0 || observed !== undefined || artifact !== undefined || exchange !== undefined
	);

	const asJson = (value: unknown) => JSON.stringify(value, null, 2);

	/** Bytes, in the units a person reads, for the truncation note. */
	function readableSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} bytes`;
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/** A truncated body arrives as a string; anything else is JSON to pretty-print. */
	const bodyText = (stage: TraceStage) =>
		typeof stage.body === 'string' ? stage.body : asJson(stage.body);

	/** "Showing the first 8 KB of 412 KB." — say how much is missing, never cut silently. */
	const truncationNote = (stage: TraceStage) =>
		stage.truncated
			? `Showing the first ${readableSize(bodyText(stage).length)} of ${readableSize(
					stage.truncated.originalBytes
				)}.`
			: undefined;
</script>

{#snippet json(value: unknown)}
	<pre
		class="text-label-sm mt-1 max-h-72 overflow-auto rounded bg-muted p-2 text-foreground normal-case">{asJson(
			value
		)}</pre>
{/snippet}

{#if hasDetails}
	<!--
		Hidden in print: a printed run report is the outcome list, not a wire dump.
		The panel is neutral-toned even when a stage failed — the per-stage markers
		carry the tone, so the disclosure itself does not read as an error state.
	-->
	<details class="text-label-md print:hidden">
		<summary class="cursor-pointer text-muted-foreground hover:text-foreground">Details</summary>

		<!--
			`normal-case` on the wrapper: the label tokens this panel sits inside
			carry `text-transform: uppercase`, which is right for an eyebrow heading
			and wrong for prose — and actively harmful for a URL, which has to read
			exactly as it went over the wire. Elements that WANT the eyebrow treatment
			re-apply it through their own `text-label-*` class.
		-->
		<div class="mt-2 space-y-3 normal-case">
			{#if stages.length > 0}
				<section>
					<h3 class="text-label-md font-medium text-foreground">What happened on the wire</h3>
					<ol class="mt-1 space-y-2">
						{#each stages as stage, index (`${stage.name}-${index}`)}
							<li class="rounded-sm border border-border p-2">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
									<span
										aria-hidden="true"
										class={`size-2 shrink-0 self-center rounded-full ${
											stage.ok ? 'bg-result-pass' : 'bg-result-fail'
										}`}
									></span>
									<span class="text-label-md font-medium text-foreground">{stage.label}</span>
									{#if stage.method}
										<span class="text-label-sm font-mono text-muted-foreground">{stage.method}</span
										>
									{/if}
									{#if stage.url}
										<span
											class="text-label-sm min-w-0 flex-1 truncate font-mono text-muted-foreground normal-case"
										>
											{stage.url}
										</span>
									{/if}
									{#if stage.status !== undefined}
										<span
											class={`text-label-sm ml-auto shrink-0 font-mono ${
												stage.ok ? 'text-muted-foreground' : 'text-result-fail'
											}`}
										>
											{stage.status}
										</span>
									{/if}
								</div>

								{#if stage.error}
									<p class="mt-1 text-body-md text-result-fail">{stage.error}</p>
								{/if}

								{#if stage.body !== undefined}
									<details class="mt-1">
										<summary class="cursor-pointer text-muted-foreground hover:text-foreground">
											Response body
										</summary>
										{#if stage.truncated}
											<p class="mt-1 text-muted-foreground">{truncationNote(stage)}</p>
										{/if}
										<pre
											class="text-label-sm mt-1 max-h-72 overflow-auto rounded bg-muted p-2 text-foreground normal-case">{bodyText(
												stage
											)}</pre>
									</details>
								{/if}
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if observed !== undefined}
				<section>
					<h3 class="text-label-md font-medium text-foreground">What this step observed</h3>
					<p class="text-muted-foreground">
						The facts the requirements above were checked against.
					</p>
					{@render json(observed)}
				</section>
			{/if}

			{#if exchange !== undefined}
				<section>
					<h3 class="text-label-md font-medium text-foreground">The exchange</h3>
					{@render json(exchange)}
				</section>
			{/if}

			{#if artifact !== undefined}
				<section>
					<details>
						<summary class="cursor-pointer text-label-md font-medium text-foreground">
							The credential we received
						</summary>
						{@render json(artifact)}
					</details>
				</section>
			{/if}
		</div>
	</details>
{/if}
