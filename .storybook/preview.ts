import '../src/routes/layout.css';
import type { Preview } from '@storybook/sveltekit';

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
	decorators: [],
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
