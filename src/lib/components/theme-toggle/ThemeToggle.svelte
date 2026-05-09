<script lang="ts">
	import { onMount } from 'svelte';

	import { Button } from '$lib/components/ui/button/index.js';

	type Theme = 'light' | 'dark' | 'system';

	let currentTheme = $state<Theme>('system');
	let resolvedTheme = $state<'light' | 'dark'>('light');

	function getSystemTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(theme: 'light' | 'dark') {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', theme === 'dark');
		resolvedTheme = theme;
	}

	function setTheme(theme: Theme) {
		currentTheme = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', theme);
		}
		applyTheme(theme === 'system' ? getSystemTheme() : theme);
	}

	function toggleTheme() {
		if (currentTheme === 'light') setTheme('dark');
		else if (currentTheme === 'dark') setTheme('system');
		else setTheme('light');
	}

	onMount(() => {
		const saved = (
			typeof window !== 'undefined' ? localStorage.getItem('theme') : null
		) as Theme | null;
		setTheme(saved ?? 'system');

		if (typeof window !== 'undefined') {
			const mq = window.matchMedia('(prefers-color-scheme: dark)');
			const onChange = () => {
				if (currentTheme === 'system') applyTheme(getSystemTheme());
			};
			mq.addEventListener('change', onChange);
			return () => mq.removeEventListener('change', onChange);
		}
	});
</script>

<Button
	variant="outline"
	size="icon"
	aria-label={`Toggle theme (current: ${currentTheme})`}
	onclick={toggleTheme}
>
	{#if resolvedTheme === 'dark'}
		<!-- Sun -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" /><path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" /><path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
		</svg>
	{:else}
		<!-- Moon -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	{/if}
</Button>
