import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

describe('/about/+page.svelte', () => {
	it('renders the about heading and the compliance-vs-interoperability section', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toHaveTextContent('About the LER Interoperability Test Suite');

		await expect
			.element(page.getByRole('heading', { name: 'Standards compliance is not interoperability' }))
			.toBeInTheDocument();
	});
});
