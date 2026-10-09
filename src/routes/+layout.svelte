<script lang="ts">
	import { onMount } from 'svelte';

	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { createPerspectiveStore, setPerspectiveStore } from '$lib/client/perspective/index.js';
	import { AppHeader } from '$lib/components/app-header/index.js';

	let { data, children } = $props();

	// Per request on the server, so created here rather than at module scope. The
	// cookie seeds it once; after that the store owns the value and writes it back.
	// svelte-ignore state_referenced_locally
	setPerspectiveStore(createPerspectiveStore(data.perspective));

	onMount(() => {
		if (typeof window === 'undefined') return;

		const apply = () => {
			const theme = localStorage.getItem('theme') || 'system';
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
			document.documentElement.classList.toggle('dark', resolved === 'dark');
		};
		apply();

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			if ((localStorage.getItem('theme') || 'system') === 'system') apply();
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>LER Interoperability Test Suite</title>
</svelte:head>

<AppHeader />
<main class="@container mx-auto max-w-7xl px-4 py-12">{@render children()}</main>
