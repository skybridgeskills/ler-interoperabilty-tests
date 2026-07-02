<script lang="ts">
	import { outcomeBadge } from '$lib/components/interop/issuer-runner/requirement-report/outcome-status-badge.js';
	import {
		requirementLevelClass,
		requirementLevelVariant
	} from '$lib/components/interop/workflow-checklist/requirement-level-badge.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

	/**
	 * One checklist requirement, lit up with the live outcome from an issuer-flow run. Renders a
	 * status dot + level badge + text + status pill; a `fail`/`warn` message appears inline
	 * directly beneath the requirement; a collapsed-by-default `<details>` discloses the outcome
	 * message and the relevant raw response body. Requirements whose step has not run yet render
	 * as *pending* (hollow dot, no error).
	 */
	let {
		requirement,
		outcome,
		raw
	}: {
		requirement: { level: 'MUST' | 'SHOULD' | 'MAY'; text: string };
		outcome?: CheckOutcome;
		raw?: unknown;
	} = $props();

	const status = $derived(outcome?.status);
	const dotClass = $derived(
		status === 'pass'
			? 'bg-success'
			: status === 'warn'
				? 'bg-amber-500'
				: status === 'n/a'
					? 'bg-muted-foreground/40'
					: status === 'fail'
						? requirement.level === 'MUST'
							? 'bg-destructive'
							: 'bg-amber-500'
						: 'border border-muted-foreground/40'
	);
	const badge = $derived(
		outcome
			? outcomeBadge(outcome)
			: { label: 'PENDING', className: 'bg-muted text-muted-foreground border-border' }
	);
	const showInlineError = $derived(!!outcome && (status === 'fail' || status === 'warn'));
	const inlineErrorClass = $derived(
		status === 'fail' && requirement.level === 'MUST' ? 'text-destructive' : 'text-amber-500'
	);
	const rawJson = $derived(raw === undefined ? undefined : JSON.stringify(raw, null, 2));
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
			<span
				class={`text-label-sm shrink-0 rounded-full border px-2 py-0.5 uppercase ${badge.className}`}
			>
				{badge.label}
			</span>
		</span>

		{#if showInlineError && outcome}
			<p class={`text-label-md ${inlineErrorClass}`}>{outcome.message}</p>
		{/if}

		{#if outcome || rawJson}
			<details class="text-label-md">
				<summary class="cursor-pointer text-muted-foreground hover:text-foreground">Details</summary
				>
				{#if outcome && !showInlineError}
					<p class="mt-1 text-muted-foreground">{outcome.message}</p>
				{/if}
				{#if rawJson}
					<pre
						class="text-label-sm mt-1 max-h-72 overflow-auto rounded bg-muted p-2 text-foreground normal-case">{rawJson}</pre>
				{/if}
			</details>
		{/if}
	</div>
</div>
