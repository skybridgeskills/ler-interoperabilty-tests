import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders the console heading, role toggles, profile section, and checklist rows', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toHaveTextContent('LER Interoperability Test Suite');

		// Roles are interactive toggles (buttons), not links to role pages.
		await expect.element(page.getByRole('button', { name: /Issuers/ })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Wallets/ })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Verifiers/ })).toBeInTheDocument();

		// Profiles section is present.
		await expect
			.element(page.getByRole('heading', { name: 'Interoperability profiles' }))
			.toBeInTheDocument();

		// The workflows list renders checklist rows, each with an "Open checklist" link.
		await expect
			.element(page.getByRole('link', { name: /^Open checklist/ }).first())
			.toBeInTheDocument();
	});
});
