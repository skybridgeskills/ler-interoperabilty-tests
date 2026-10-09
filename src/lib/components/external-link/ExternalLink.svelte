<script lang="ts">
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import type { Snippet } from 'svelte';

	/**
	 * Every link that leaves the suite: **named** text (never a raw URL), the
	 * `arrow-up-right` icon, a new tab with `rel="noopener noreferrer"`, and a
	 * `title` that names the target in full — "OpenID for Verifiable Credential
	 * Issuance 1.0 · OpenID Final".
	 */
	let {
		href,
		title,
		muted = false,
		children
	}: {
		href: string;
		title?: string;
		/** Quieter colour for a hero's meta line. */
		muted?: boolean;
		children: Snippet;
	} = $props();
</script>

<a
	{href}
	{title}
	target="_blank"
	rel="noopener noreferrer"
	class={[
		'inline-flex items-baseline gap-0.5 hover:underline',
		muted ? 'text-foreground underline-offset-2' : 'text-primary'
	]}
>
	{@render children()}
	<ArrowUpRight class="size-3.5 shrink-0 self-center" aria-hidden="true" />
	<span class="sr-only">(opens in a new tab)</span>
</a>
