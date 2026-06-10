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
		setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
	}

	onMount(() => {
		const saved = (
			typeof window !== 'undefined' ? localStorage.getItem('theme') : null
		) as Theme | null;

		if (saved === 'light' || saved === 'dark') {
			setTheme(saved);
		} else {
			currentTheme = 'system';
			applyTheme(getSystemTheme());
		}

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

{#snippet SunIcon()}
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2" /><path d="M12 20v2" />
		<path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
		<path d="M2 12h2" /><path d="M20 12h2" />
		<path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
	</svg>
{/snippet}

{#snippet MoonIcon()}
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
	</svg>
{/snippet}

<Button
	variant="outline"
	size="icon"
	class="theme-toggle relative overflow-hidden"
	aria-label={resolvedTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
	aria-pressed={resolvedTheme === 'dark'}
	onclick={toggleTheme}
>
	<span class="theme-toggle__rest" aria-hidden="true">
		{#if resolvedTheme === 'light'}
			{@render SunIcon()}
		{:else}
			{@render MoonIcon()}
		{/if}
	</span>

	<span
		class="theme-toggle__preview"
		class:theme-toggle__preview--dark={resolvedTheme === 'light'}
		class:theme-toggle__preview--light={resolvedTheme === 'dark'}
		aria-hidden="true"
	>
		{#if resolvedTheme === 'light'}
			{@render MoonIcon()}
		{:else}
			{@render SunIcon()}
		{/if}
	</span>
</Button>

<style>
	.theme-toggle__rest {
		display: grid;
		place-items: center;
		transition: opacity 150ms ease;
	}

	.theme-toggle__preview {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		border-radius: var(--radius-lg);
		border-width: 1px;
		border-style: solid;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	/* Opposite-theme outline button hover — explicit tokens so page theme cannot bleed through. */
	.theme-toggle__preview--dark {
		border-color: hsl(231 12% 25%);
		background-color: hsl(231 12% 20%);
		color: hsl(230 73% 86%);
	}

	.theme-toggle__preview--light {
		border-color: hsl(220 13% 78%);
		background-color: hsl(220 16% 88%);
		color: hsl(234 16% 13%);
	}

	:global(.theme-toggle:hover) .theme-toggle__rest,
	:global(.theme-toggle:focus-visible) .theme-toggle__rest {
		opacity: 0;
	}

	:global(.theme-toggle:hover) .theme-toggle__preview,
	:global(.theme-toggle:focus-visible) .theme-toggle__preview {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-toggle__rest,
		.theme-toggle__preview {
			transition: none;
		}
	}
</style>
