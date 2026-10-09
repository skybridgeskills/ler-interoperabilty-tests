<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { Perspective } from '$lib/interop/perspective/index.js';

	/** One live hero for the review matrix: holds its own Perspective so its controls work. */
	let {
		initial,
		hero
	}: {
		initial: Perspective | undefined;
		hero: Snippet<[Perspective | undefined, (perspective: Perspective) => void]>;
	} = $props();

	// svelte-ignore state_referenced_locally
	let perspective = $state(initial);
</script>

{@render hero(perspective, (p) => (perspective = p))}
