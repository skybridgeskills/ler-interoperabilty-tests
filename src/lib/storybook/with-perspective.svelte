<script lang="ts">
	import type { Snippet } from 'svelte';

	import { createPerspectiveStore, setPerspectiveStore } from '$lib/client/perspective/index.js';
	import type { PerspectiveCookieValue } from '$lib/interop/perspective/index.js';

	interface Props {
		/** The cookie value the story starts from; omit for a first visit. */
		perspective?: PerspectiveCookieValue;
		children: Snippet;
	}

	let { perspective, children }: Props = $props();

	// svelte-ignore state_referenced_locally
	setPerspectiveStore(createPerspectiveStore(perspective));
</script>

<!-- Provides a Perspective store to a story, as the root layout does for a page. -->
{@render children()}
