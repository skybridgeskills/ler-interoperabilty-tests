import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders the LandingPage heading and three feature cards', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toHaveTextContent('LER Interoperability Test Suite');

		await expect.element(page.getByRole('link', { name: /wallet/i })).toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: /verifier/i })).toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: /issuer/i })).toBeInTheDocument();
	});
});
