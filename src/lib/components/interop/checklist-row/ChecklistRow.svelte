<script lang="ts" module>
	/** Absolute run timestamp, locale-aware (e.g. "Jul 11, 2026, 10:48 PM"). */
	function formatAbsolute(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	/** Coarse relative time ("3 hours ago", "just now") via Intl.RelativeTimeFormat. */
	function formatRelative(iso: string, now: number = Date.now()): string {
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return '';
		const seconds = Math.round((then - now) / 1000);
		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
		const units: [Intl.RelativeTimeFormatUnit, number][] = [
			['year', 60 * 60 * 24 * 365],
			['month', 60 * 60 * 24 * 30],
			['day', 60 * 60 * 24],
			['hour', 60 * 60],
			['minute', 60]
		];
		for (const [unit, secondsPerUnit] of units) {
			if (Math.abs(seconds) >= secondsPerUnit) {
				return rtf.format(Math.round(seconds / secondsPerUnit), unit);
			}
		}
		return rtf.format(seconds, 'second');
	}
</script>

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		combinedRequirements,
		isRunOutdated,
		type AdditiveProfileSlug,
		type Profile,
		type Role,
		type TestRunRecord,
		type Workflow
	} from '$lib/interop/index.js';

	import { RoleBadge } from '../role-badge/index.js';
	import { RunResultBadge } from '../run-result-badge/index.js';

	import { resolve } from '$app/paths';

	/**
	 * Shopping-cart-style row for one (role, workflow, profile) combination.
	 * Selected rows are prominent; unselected rows are de-emphasized but still
	 * readable and navigable. Presentational — selection/run data come via props.
	 *
	 * When a combination has more than one retained run, the row can expand to
	 * reveal its recent runs (newest-first), each deep-linking to `/runs/<id>`.
	 */
	let {
		combination,
		selected,
		latestRun,
		recentRuns = [],
		href,
		appliedAdditives = []
	}: {
		combination: { role: Role; workflow: Workflow; profile: Profile };
		selected: boolean;
		/** Collapsed-state badge source (newest run for this combination). */
		latestRun?: TestRunRecord;
		/** Retained runs for this combination, newest-first (from `runsFor`). */
		recentRuns?: TestRunRecord[];
		href: string;
		/** Selected additive profiles that apply to this row's combination. */
		appliedAdditives?: { slug: AdditiveProfileSlug; name: string }[];
	} = $props();

	let expanded = $state(false);

	// Only offer the expander when there's more than the single latest run.
	const canExpand = $derived(recentRuns.length > 1);

	// Live combined requirements for drift detection; recomputed if the row's
	// combination changes. Empty for an invalid combination → nothing flagged.
	const requirements = $derived(
		combinedRequirements(combination.role.slug, combination.workflow.slug, combination.profile.slug)
	);

	function runHref(id: string): string {
		return resolve('/runs/[id]', { id });
	}
</script>

<div
	class={`flex flex-col gap-3 rounded-md border p-3 transition ${
		selected ? 'border-primary bg-card' : 'border-border bg-card/40 opacity-65 hover:opacity-100'
	}`}
>
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<RoleBadge role={combination.role} />

		<div class="min-w-0 flex-1">
			<p class={`truncate text-body-md ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
				{combination.workflow.name}
			</p>
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="truncate text-label-md text-muted-foreground">{combination.profile.name}</span>
				{#each appliedAdditives as additive (additive.slug)}
					<Badge variant="outline" class="text-[0.7rem]">+ {additive.name}</Badge>
				{/each}
			</div>
		</div>

		<RunResultBadge record={latestRun} />

		{#if canExpand}
			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				aria-expanded={expanded}
				class="inline-flex shrink-0 items-center gap-1 text-label-md text-muted-foreground hover:text-foreground"
			>
				<span aria-hidden="true" class={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
					›
				</span>
				{recentRuns.length} runs
			</button>
		{/if}

		<a
			{href}
			class="shrink-0 text-label-md text-primary hover:underline"
			aria-label={`Open checklist for ${combination.role.name} · ${combination.workflow.name} · ${combination.profile.name}`}
		>
			Open checklist →
		</a>
	</div>

	{#if canExpand && expanded}
		<ul class="space-y-1.5 border-t border-border pt-3">
			{#each recentRuns as run (run.id)}
				{@const outdated = isRunOutdated(run, requirements)}
				<li>
					<a
						href={runHref(run.id)}
						class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm px-2 py-1.5 hover:bg-muted/50"
					>
						<RunResultBadge record={run} showTime={false} />
						<span class="text-body-sm text-foreground">{formatRelative(run.ranAt)}</span>
						<time class="text-label-md text-muted-foreground" datetime={run.ranAt}>
							· {formatAbsolute(run.ranAt)}
						</time>
						{#if outdated}
							<Badge
								variant="outline"
								class="border-result-fail-border text-[0.7rem] text-result-fail"
							>
								Outdated
							</Badge>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
