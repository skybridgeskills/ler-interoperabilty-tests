import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders the console heading, role toggles, profile section, and completion groups', async () => {
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

		// The catalog now renders as completion groups: the "Your scenarios" section
		// with a scenario row linking to the generic runner (not a bespoke page).
		await expect.element(page.getByRole('heading', { name: 'Your scenarios' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Accept a well-formed credential' }))
			.toHaveAttribute('href', '/scenarios/oid4-wallet-acceptance');

		// The parallel surface is held in a clearly-labelled "Not yet migrated"
		// section (a collapsible <summary> label, not a heading element) rather
		// than mixed into the meters.
		await expect.element(page.getByText('Not yet migrated')).toBeInTheDocument();
	});
});
