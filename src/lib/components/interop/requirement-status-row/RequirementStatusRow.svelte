<script lang="ts">
	import {
		requirementLevelClass,
		requirementLevelVariant
	} from '$lib/components/interop/workflow-checklist/requirement-level-badge.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	import { runStatusToneClasses } from './requirement-status-view.js';
	import type { RequirementLevel, RequirementStatusView } from './requirement-status-view.js';

	/**
	 * One checklist requirement, lit up with a normalized {@link RequirementStatusView}. Renders a
	 * single status treatment — a leading tone **dot** + the blue **level** badge + the requirement
	 * **text** + a plain colored status **label** on the right — plus an inline `fail`/`warn` message
	 * and a collapsed-by-default `<details>` (message when not shown inline + any raw response body).
	 * Purely presentational: the status is produced upstream by `outcomeToRequirementStatus` (issuer
	 * flow) or `stepStateToRequirementStatus` (external-wallet flow). Dot + label share one tone
	 * source ({@link runStatusToneClasses}) with the step-level `RunStatusIndicator`, so they cannot
	 * drift; cool blue is reserved for the level badge and never used for a result.
	 */
	let {
		requirement,
		status
	}: {
		requirement: { level: RequirementLevel; text: string };
		status: RequirementStatusView;
	} = $props();

	const toneClasses = $derived(runStatusToneClasses(status.tone, requirement.level));
	const showInlineError = $derived(
		(status.tone === 'fail' || status.tone === 'warn') && status.message !== undefined
	);
	const rawJson = $derived(
		status.raw === undefined ? undefined : JSON.stringify(status.raw, null, 2)
	);
</script>

<div class="flex items-start gap-3">
	<span aria-hidden="true" class={`mt-1.5 size-3 shrink-0 rounded-full ${toneClasses.dot}`}></span>
	<div class="min-w-0 flex-1 space-y-1">
		<div class="flex items-baseline gap-2">
			<Badge
				variant={requirementLevelVariant[requirement.level]}
				class={requirementLevelClass[requirement.level]}>{requirement.level}</Badge
			>
			<span class="min-w-0 flex-1 text-body-md text-foreground">{requirement.text}</span>
			<span
				class={`text-label-sm shrink-0 font-medium whitespace-nowrap uppercase ${toneClasses.label}`}
			>
				{status.label}
			</span>
		</div>

		{#if showInlineError && status.message !== undefined}
			<p class={`text-label-md ${toneClasses.label}`}>{status.message}</p>
		{/if}

		{#if status.message !== undefined || rawJson}
			<details class="text-label-md">
				<summary class="cursor-pointer text-muted-foreground hover:text-foreground">Details</summary
				>
				{#if status.message !== undefined && !showInlineError}
					<p class="mt-1 text-muted-foreground">{status.message}</p>
				{/if}
				{#if rawJson}
					<pre
						class="text-label-sm mt-1 max-h-72 overflow-auto rounded bg-muted p-2 text-foreground normal-case">{rawJson}</pre>
				{/if}
			</details>
		{/if}
	</div>
</div>
