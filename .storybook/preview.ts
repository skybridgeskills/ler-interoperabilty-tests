import '../src/routes/layout.css';
import type { Preview } from '@storybook/sveltekit';

import WithPerspective from '../src/lib/storybook/with-perspective.svelte';

function applyTheme() {
	if (typeof window === 'undefined') return;
	const theme = localStorage.getItem('theme') || 'system';
	const html = document.documentElement;
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
	html.classList.toggle('dark', resolved === 'dark');
}

if (typeof window !== 'undefined') {
	applyTheme();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme();
	});
}

const preview: Preview = {
	// Every story gets an undecided Perspective store, as the root layout provides one to every
	// page; a story wraps itself in `WithPerspective` to start from a chosen value instead.
	decorators: [() => ({ Component: WithPerspective })],
	parameters: {
		controls: {
			matchers: { color: /(background|color)$/i, date: /date$/i }
		},
		a11y: {
			// 'todo' shows a11y violations in the test UI without failing CI yet.
			test: 'todo'
		}
	}
};

export default preview;
