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
	import { ProfileBadge } from '$lib/components/interop/profile-badge/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import { RunResultBadge } from '$lib/components/interop/run-result-badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		profileBySlug,
		profileHref,
		roleBySlug,
		workflowBySlug,
		type TestRunRecord
	} from '$lib/interop/index.js';

	/**
	 * Document-header card describing a reloaded run (NOT live wallet activity).
	 * View-only: it reports the persisted run's overall result verdict, when it
	 * ran, and its role/workflow/profile identity — enough provenance to stand
	 * alone as a shareable conformance report — plus Re-run / Print-to-PDF actions
	 * the page wires up. The action row is `print:hidden`; the printed report is
	 * reflowed to lead with this card (see the `@media print` block in `layout.css`).
	 */
	let {
		record,
		onRerun,
		onPrint,
		outdated = false
	}: {
		record: TestRunRecord;
		/** Navigate to the live runnable route to run again. */
		onRerun: () => void;
		/** Trigger the browser print dialog (page wires this to `window.print()`). */
		onPrint: () => void;
		/**
		 * Optional inline drift notice. Unused in the happy path — the reopen route's
		 * outdated-block handles the outdated case — but kept for future inline use.
		 */
		outdated?: boolean;
	} = $props();

	const role = $derived(roleBySlug(record.role)!);
	const profile = $derived(profileBySlug(record.profile)!);
	const workflow = $derived(workflowBySlug(record.workflow)!);
	const relative = $derived(formatRelative(record.ranAt));
	const absolute = $derived(formatAbsolute(record.ranAt));
</script>

<Card.Root class="run-history-summary gap-4 px-4">
	<header class="space-y-2">
		<h2 class="text-label-md font-medium tracking-wide text-muted-foreground uppercase">
			Conformance run report
		</h2>
		<RunResultBadge {record} showTime={false} />
	</header>

	{#if outdated}
		<p class="text-label-md text-result-fail">
			The checklist changed since this run — re-run for current results.
		</p>
	{/if}

	<dl class="space-y-3 border-t border-border pt-4 text-body-md">
		<div class="space-y-0.5">
			<dt class="text-label-md text-muted-foreground">Run date</dt>
			<dd>
				<span>{relative}</span>
				<time class="text-muted-foreground" datetime={record.ranAt}>· {absolute}</time>
			</dd>
		</div>

		<div class="space-y-1">
			<dt class="text-label-md text-muted-foreground">Run identity</dt>
			<dd class="flex flex-wrap items-center gap-2">
				<RoleBadge {role} />
				<span class="text-foreground">{workflow.name}</span>
				<ProfileBadge {profile} href={profileHref(profile.slug)} />
			</dd>
		</div>
	</dl>

	<div class="flex flex-wrap gap-2 border-t border-border pt-4 print:hidden">
		<Button variant="default" onclick={onRerun}>Re-run</Button>
		<Button variant="outline" onclick={onPrint}>Print to PDF</Button>
	</div>
</Card.Root>
