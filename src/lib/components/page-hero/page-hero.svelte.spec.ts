import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import PageHero from './PageHero.svelte';

const text = (html: string) => createRawSnippet(() => ({ render: () => html }));

/**
 * `pnpm turbo validate` runs the production build beside the browser projects —
 * enough load to trip the default timeout on real clicks. Same allowance the
 * sibling component and route specs take.
 */
const UNDER_LOAD = { timeout: 20_000 };

describe('PageHero', UNDER_LOAD, () => {
	it('renders the title as the page h1', async () => {
		render(PageHero, {
			perspective: undefined,
			onPerspectiveChange: () => {},
			title: text('<span>Standard Profiles</span>')
		});
		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Standard Profiles');
	});

	it('compact renders the Perspective chip even when the page passes no chips', async () => {
		render(PageHero, {
			perspective: undefined,
			onPerspectiveChange: () => {},
			title: text('<span>About</span>')
		});
		await expect
			.element(page.getByRole('button', { name: /Choose perspective/ }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('radiogroup')).not.toBeInTheDocument();
	});

	it('compact puts the Perspective chip before the page’s own chips', async () => {
		const screen = render(PageHero, {
			perspective: 'builder',
			onPerspectiveChange: () => {},
			title: text('<span>A scenario</span>'),
			chips: text('<a href="/wallet">Wallet</a>')
		});
		const row = screen.container.querySelector('[aria-haspopup="menu"]')?.parentElement;
		expect(row?.firstElementChild?.getAttribute('aria-haspopup')).toBe('menu');
		expect(row?.lastElementChild?.textContent).toBe('Wallet');
	});

	it('large renders the switch, no chip, and no breadcrumb', async () => {
		render(PageHero, {
			size: 'large',
			perspective: undefined,
			onPerspectiveChange: () => {},
			title: text('<span>LER Interoperability Test Suite</span>'),
			breadcrumb: text('<a href="/">Home</a>')
		});
		await expect.element(page.getByRole('radiogroup')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: /perspective/i }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('navigation', { name: 'Breadcrumb' }))
			.not.toBeInTheDocument();
	});

	it('the large switch reports the chosen Perspective', async () => {
		const onPerspectiveChange = vi.fn();
		render(PageHero, {
			size: 'large',
			perspective: undefined,
			onPerspectiveChange,
			title: text('<span>Home</span>')
		});
		await page.getByRole('radio', { name: 'I’m evaluating' }).click();
		expect(onPerspectiveChange).toHaveBeenCalledWith('evaluator');
	});

	it('the compact chip reports the chosen Perspective from its menu', async () => {
		const onPerspectiveChange = vi.fn();
		render(PageHero, {
			perspective: undefined,
			onPerspectiveChange,
			title: text('<span>A scenario</span>')
		});
		await page.getByRole('button', { name: /Choose perspective/ }).click();
		await page.getByRole('menuitemradio', { name: /Building/ }).click();
		expect(onPerspectiveChange).toHaveBeenCalledWith('builder');
	});
});
