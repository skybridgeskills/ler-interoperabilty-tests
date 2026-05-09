<script lang="ts">
	let { title, blurb }: { title: string; blurb: string } = $props();
</script>

<section class="space-y-4">
	<h1 class="text-headline-md">{title}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{blurb}</p>
	<p class="text-label-md text-accent">Coming soon</p>
</section>
