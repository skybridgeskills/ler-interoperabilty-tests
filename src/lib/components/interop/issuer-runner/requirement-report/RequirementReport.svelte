<script lang="ts">
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import { outcomeBadge } from './outcome-status-badge.js';

	let { report }: { report: IssuerRunnerReport } = $props();

	const failingMustCount = $derived(
		report.groups
			.flatMap((g) => g.outcomes)
			.filter((o) => o.level === 'MUST' && o.status === 'fail').length
	);

	const banner = $derived(
		report.fatalError
			? {
					tone: 'destructive' as const,
					title: 'Verification could not complete',
					body: report.fatalError.message,
					hint: report.fatalError.hint
				}
			: report.verified
				? {
						tone: 'primary' as const,
						title: 'Verified',
						body:
							failingMustCount > 0
								? ''
								: 'No MUST requirements failed across the selected checklists.',
						hint: undefined
					}
				: {
						tone: 'destructive' as const,
						title: 'Not verified',
						body:
							failingMustCount > 0
								? `${failingMustCount} MUST requirement${failingMustCount === 1 ? '' : 's'} failed.`
								: 'No MUST requirements are passing yet.',
						hint: undefined
					}
	);
</script>

<section class="space-y-6">
	<div
		class="rounded-md border p-4"
		class:border-primary={banner.tone === 'primary'}
		class:bg-primary={banner.tone === 'primary'}
		class:bg-opacity-5={banner.tone === 'primary'}
		class:border-destructive={banner.tone === 'destructive'}
		class:bg-destructive={banner.tone === 'destructive'}
	>
		<p
			class="text-label-md uppercase"
			class:text-primary={banner.tone === 'primary'}
			class:text-destructive={banner.tone === 'destructive'}
		>
			{banner.title}
		</p>
		{#if banner.body}
			<p class="mt-1 text-body-md text-foreground">{banner.body}</p>
		{/if}
		{#if banner.hint}
			<p class="mt-1 text-label-md text-muted-foreground">{banner.hint}</p>
		{/if}
	</div>

	{#each report.groups as group (group.checklist.profileSlug)}
		<section class="space-y-3">
			<header class="flex flex-wrap items-baseline gap-2">
				<h3 class="text-headline-sm text-foreground">{group.checklist.profileName}</h3>
				<span class="text-label-md text-muted-foreground">
					{group.checklist.kind === 'additive' ? 'additive · ' : 'base · '}
					{group.checklist.role} × {group.checklist.workflow}
				</span>
			</header>
			<ul class="space-y-2">
				{#each group.outcomes as outcome (outcome.id)}
					{@const badge = outcomeBadge(outcome)}
					<li class="rounded-md border border-border p-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-1">
								<p class="text-body-md text-foreground">{outcome.message}</p>
								<p class="text-label-md font-mono text-muted-foreground">{outcome.id}</p>
							</div>
							<span
								class="text-label-sm shrink-0 rounded-full border px-2 py-1 uppercase {badge.className}"
							>
								{badge.label}
							</span>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</section>
