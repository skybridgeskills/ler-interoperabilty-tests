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
