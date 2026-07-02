<script lang="ts">
	import {
		requirementLevelClass,
		requirementLevelVariant
	} from '$lib/components/interop/workflow-checklist/requirement-level-badge.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	import type { RequirementLevel, RequirementStatusView } from './requirement-status-view.js';

	/**
	 * One checklist requirement, lit up with a normalized {@link RequirementStatusView}. Renders a
	 * status dot + level badge + text + status pill; a `fail`/`warn` message appears inline directly
	 * beneath the requirement; a collapsed-by-default `<details>` discloses the message (when not
	 * shown inline) and any raw response body. Purely presentational — the status is produced
	 * upstream by `outcomeToRequirementStatus` (issuer flow) or `stepStateToRequirementStatus`
	 * (external-wallet flow), so a future per-requirement `CheckOutcome` path reuses this row
	 * unchanged.
	 */
	let {
		requirement,
		status
	}: {
		requirement: { level: RequirementLevel; text: string };
		status: RequirementStatusView;
	} = $props();

	const dotClass = $derived(
		status.tone === 'pass'
			? 'bg-success'
			: status.tone === 'warn'
				? 'bg-amber-500'
				: status.tone === 'fail'
					? requirement.level === 'MUST'
						? 'bg-destructive'
						: 'bg-amber-500'
					: status.tone === 'n/a'
						? 'bg-muted-foreground/40'
						: status.tone === 'in-flight'
							? 'bg-progress animate-pulse'
							: status.tone === 'skipped'
								? 'bg-muted-foreground/30'
								: 'border border-muted-foreground/40'
	);
	const pillClass = $derived(
		status.tone === 'pass'
			? 'bg-primary/10 text-primary border-primary/40'
			: status.tone === 'warn'
				? 'bg-amber-500/10 text-amber-500 border-amber-500/40'
				: status.tone === 'fail'
					? requirement.level === 'MUST'
						? 'bg-destructive/10 text-destructive border-destructive/40'
						: 'bg-amber-500/10 text-amber-500 border-amber-500/40'
					: status.tone === 'in-flight'
						? 'bg-progress-soft text-progress border-progress-border'
						: 'bg-muted text-muted-foreground border-border'
	);
	const showInlineError = $derived(
		(status.tone === 'fail' || status.tone === 'warn') && status.message !== undefined
	);
	const inlineErrorClass = $derived(
		status.tone === 'fail' && requirement.level === 'MUST' ? 'text-destructive' : 'text-amber-500'
	);
	const rawJson = $derived(
		status.raw === undefined ? undefined : JSON.stringify(status.raw, null, 2)
	);
</script>

<div class="flex items-start gap-3">
	<span aria-hidden="true" class={`mt-1.5 size-3 shrink-0 rounded-full ${dotClass}`}></span>
	<div class="min-w-0 flex-1 space-y-1">
		<span class="flex flex-wrap items-baseline gap-2">
			<Badge
				variant={requirementLevelVariant[requirement.level]}
				class={requirementLevelClass[requirement.level]}>{requirement.level}</Badge
			>
			<span class="text-body-md text-foreground">{requirement.text}</span>
			<span class={`text-label-sm shrink-0 rounded-full border px-2 py-0.5 uppercase ${pillClass}`}>
				{status.label}
			</span>
		</span>

		{#if showInlineError && status.message !== undefined}
			<p class={`text-label-md ${inlineErrorClass}`}>{status.message}</p>
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
