<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Theme/Palette'
	});
</script>

<Story name="Palette" asChild>
	<div class="space-y-12 bg-background p-8">
		<section class="space-y-4">
			<h2 class="text-headline-md text-foreground">Filled tokens</h2>
			<div class="grid gap-4 md:grid-cols-3">
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-primary p-4 text-primary-foreground"
				>
					<span class="text-body-md">primary</span>
					<span class="text-label-md opacity-80">primary-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary p-4 text-secondary-foreground"
				>
					<span class="text-body-md">secondary</span>
					<span class="text-label-md opacity-80">secondary-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-accent p-4 text-accent-foreground"
				>
					<span class="text-body-md">accent</span>
					<span class="text-label-md opacity-80">accent-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-warning p-4 text-warning-foreground"
				>
					<span class="text-body-md">warning</span>
					<span class="text-label-md opacity-80">warning-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-destructive p-4 text-destructive-foreground"
				>
					<span class="text-body-md">destructive</span>
					<span class="text-label-md opacity-80">destructive-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-live p-4 text-live-foreground"
				>
					<span class="text-body-md">live</span>
					<span class="text-label-md opacity-80">live-foreground</span>
				</div>
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-headline-md text-foreground">Surface tokens</h2>
			<div class="grid gap-4 md:grid-cols-2">
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-4 text-card-foreground"
				>
					<span class="text-body-md">card</span>
					<span class="text-label-md opacity-80">card-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted p-4 text-muted-foreground"
				>
					<span class="text-body-md">muted</span>
					<span class="text-label-md opacity-80">muted-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-live-border bg-live-soft p-4 text-live"
				>
					<span class="text-body-md">live-soft</span>
					<span class="text-label-md opacity-80">live (text)</span>
				</div>
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-headline-md text-foreground">Requirement (blue)</h2>
			<p class="max-w-prose text-body-md text-muted-foreground">
				Conformance levels render in the cool <code class="font-mono">requirement</code> family. Red is
				reserved for actual run failures.
			</p>
			<div class="grid gap-4 md:grid-cols-2">
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-requirement p-4 text-requirement-foreground"
				>
					<span class="text-body-md">requirement</span>
					<span class="text-label-md opacity-80">requirement-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-requirement-border bg-requirement-soft p-4 text-requirement"
				>
					<span class="text-body-md">requirement-soft</span>
					<span class="text-label-md opacity-80">requirement (text)</span>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="inline-flex h-5 items-center rounded-4xl border border-transparent bg-requirement px-2 text-xs font-medium text-requirement-foreground"
					>MUST</span
				>
				<span
					class="inline-flex h-5 items-center rounded-4xl border border-requirement-border bg-requirement-soft px-2 text-xs font-medium text-requirement"
					>SHOULD</span
				>
				<span
					class="inline-flex h-5 items-center rounded-4xl border border-requirement-border bg-transparent px-2 text-xs font-medium text-requirement"
					>MAY</span
				>
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-headline-md text-foreground">Success, run result + progress</h2>
			<p class="max-w-prose text-body-md text-muted-foreground">
				<code class="font-mono">success</code> (green) marks anything completed + successful — a
				done checklist step and a passed run (<code class="font-mono">result-pass</code> aliases
				it).
				<code class="font-mono">result-fail</code>
				(red, aliases destructive), <code class="font-mono">result-incomplete</code> (neutral). The
				warm <code class="font-mono">progress</code> family aliases
				<code class="font-mono">live</code> and is reserved for in-flight runtime — never for finished
				work.
			</p>
			<div class="grid gap-4 md:grid-cols-2">
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border bg-success p-4 text-success-foreground"
				>
					<span class="text-body-md">success</span>
					<span class="text-label-md opacity-80">success-foreground</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-result-pass-border bg-result-pass-soft p-4 text-result-pass"
				>
					<span class="text-body-md">result-pass-soft</span>
					<span class="text-label-md opacity-80">result-pass (text)</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-result-fail-border bg-result-fail-soft p-4 text-result-fail"
				>
					<span class="text-body-md">result-fail-soft</span>
					<span class="text-label-md opacity-80">result-fail (text)</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-result-incomplete-border bg-result-incomplete-soft p-4 text-result-incomplete"
				>
					<span class="text-body-md">result-incomplete-soft</span>
					<span class="text-label-md opacity-80">result-incomplete (text)</span>
				</div>
				<div
					class="flex items-center justify-between gap-3 rounded-md border border-progress-border bg-progress-soft p-4 text-progress"
				>
					<span class="text-body-md">progress-soft</span>
					<span class="text-label-md opacity-80">progress (text)</span>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="inline-flex h-5 items-center rounded-4xl border border-result-pass-border bg-result-pass-soft px-2 text-xs font-medium text-result-pass"
					>passed</span
				>
				<span
					class="inline-flex h-5 items-center rounded-4xl border border-result-fail-border bg-result-fail-soft px-2 text-xs font-medium text-result-fail"
					>failed</span
				>
				<span
					class="inline-flex h-5 items-center rounded-4xl border border-result-incomplete-border bg-result-incomplete-soft px-2 text-xs font-medium text-result-incomplete"
					>incomplete</span
				>
				<span class="inline-flex items-center gap-2 text-label-md">
					<span aria-hidden="true" class="size-2 animate-pulse rounded-full bg-progress"></span>
					<span class="text-progress">In progress</span>
				</span>
				<span class="inline-flex items-center gap-2 text-label-md">
					<span aria-hidden="true" class="size-2 rounded-full bg-success"></span>
					<span class="font-semibold text-success">Done</span>
				</span>
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-headline-md text-foreground">Live state in context</h2>
			<div class="rounded-md border border-live-border bg-live-soft p-6">
				<p class="text-label-md text-live">Live · in flight</p>
				<p class="mt-2 text-body-md text-foreground">
					This panel uses <code class="font-mono">bg-live-soft</code> as the surface,
					<code class="font-mono">border-live-border</code> as the edge, and
					<code class="font-mono">text-live</code> for the active label. Reserve this combination for
					runtime artifacts (interaction URLs, QR codes, exchange status).
				</p>
				<button
					type="button"
					class="mt-4 rounded-md bg-live px-3 py-1.5 text-body-md text-live-foreground transition hover:opacity-90"
				>
					Initiate exchange
				</button>
			</div>
		</section>
	</div>
</Story>
