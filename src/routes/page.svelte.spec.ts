import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders the console heading, the filter bar, and the completion groups', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toHaveTextContent('LER Interoperability Test Suite');

		// The three choosers are now one filter bar. Each dimension is a trigger
		// that states its own selection; an untouched dimension reads "Any" rather
		// than rendering blank.
		await expect.element(page.getByRole('button', { name: 'Roles Any' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Profiles Any' })).toBeInTheDocument();

		// Add-ons are absent until a relevant role is selected — an additive layers
		// on a base profile *in a role*, so it is not offered before one is picked.
		await expect.element(page.getByRole('button', { name: /Add-ons/ })).not.toBeInTheDocument();

		// The catalog renders as completion groups: a scenario row linking to the
		// generic runner (not a bespoke page).
		await expect
			.element(page.getByRole('link', { name: 'Accept a well-formed credential' }))
			.toHaveAttribute('href', '/scenarios/oid4-wallet-acceptance');

		// The parallel surface is held in a clearly-labelled "Not yet migrated"
		// section (a collapsible <summary> label, not a heading element) rather
		// than mixed into the meters.
		await expect.element(page.getByText('Not yet migrated')).toBeInTheDocument();
	});

	it('opens the roles panel with the role toggles and their docs links', async () => {
		render(Page);

		await page.getByRole('button', { name: 'Roles Any' }).click();

		// The panel carries the educational content the page used to inline: every
		// role as a switch, each with a link to its own page.
		await expect.element(page.getByRole('switch', { name: /Issuers/ })).toBeInTheDocument();
		await expect.element(page.getByRole('switch', { name: /Wallets/ })).toBeInTheDocument();
		await expect.element(page.getByRole('switch', { name: /Verifiers/ })).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'About wallets →' }))
			.toHaveAttribute('href', '/wallet');
	});

	it('opens the profiles panel with the profile toggles', async () => {
		render(Page);

		await page.getByRole('button', { name: 'Profiles Any' }).click();

		await expect
			.element(page.getByRole('heading', { name: 'Interoperability profiles' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('switch', { name: /OID4 Profile/ })).toBeInTheDocument();
	});
});
