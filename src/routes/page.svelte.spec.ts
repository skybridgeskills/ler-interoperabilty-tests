import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

/**
 * The route now has a server load supplying `blocked`, so every render passes a
 * `data` prop. Nothing is blocked here: this deployment's tenant map is not what
 * these tests are about, and an empty map is what an all-elective catalog gives.
 */

/** Every completion meter's `met of total` label, in document order. */
function meterLabels(root: HTMLElement): (string | null)[] {
	return [...root.querySelectorAll('[role="progressbar"]')].map((el) =>
		el.getAttribute('aria-label')
	);
}

describe('/+page.svelte', () => {
	it('renders the console heading, the filter bar, and the completion groups', async () => {
		render(Page, { data: { blocked: {} } });

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
			.element(page.getByRole('link', { name: 'Accept a well-formed credential over OID4VCI' }))
			.toHaveAttribute('href', '/scenarios/oid4-wallet-acceptance');

		// The "Not yet migrated" section is GONE. It held the parallel surface —
		// combinations with no scenario yet, counting toward no meter — and it
		// shrank with each migration; the wallet pages were the last three, so it
		// now renders nothing. The section markup is M13's to delete along with
		// `profile.checklists`; this asserts it is already empty, which is the
		// signal that M13 is unblocked.
		await expect.element(page.getByText('Not yet migrated')).not.toBeInTheDocument();
	});

	it('opens the roles panel with the role toggles and their docs links', async () => {
		render(Page, { data: { blocked: {} } });

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

	/**
	 * The denominator invariant, at the surface that renders it.
	 *
	 * A blocked scenario is **still counted**: its requirements stay in `total` and
	 * the badge is blocked instead. A shrinking denominator would let two
	 * deployments issue badges that look identical and mean different things, which
	 * is the one thing the completion model exists to prevent — so this compares
	 * every meter on the page, not one.
	 */
	it('renders a blocked scenario disabled and shrinks no denominator', async () => {
		// A blocked map is slug-keyed and says nothing about the catalog, so any
		// registered scenario demonstrates the state. Deliberately NOT one of the
		// pinned DIC accept scenarios: those are add-on rows, which render only once
		// the reader has selected that add-on, so a spec using one would be asserting
		// against the filter rather than against blocked-ness. The reasons this
		// deployment would actually give are `resolveIssuingContext`'s, tested there.
		const blocked = {
			'oid4-wallet-acceptance': {
				kind: 'cryptosuite-unavailable',
				requested: 'ecdsa-rdfc-2019',
				available: ['eddsa-rdfc-2022']
			}
		} as never;

		const { container: unblocked } = render(Page, { data: { blocked: {} } });
		const { container: withBlocked } = render(Page, { data: { blocked } });

		// `aria-label` is `${met} of ${total} requirements met`; no runs are seeded,
		// so met is 0 on both sides and this compares denominators.
		expect(meterLabels(withBlocked)).toEqual(meterLabels(unblocked));
		expect(meterLabels(withBlocked).length).toBeGreaterThan(0);

		// The row is disabled in place, never hidden: it is what explains the meter
		// it is still counted in.
		const row = withBlocked.querySelector('.opacity-60');
		expect(row).not.toBeNull();
		expect(row!.textContent).toContain('Accept a well-formed credential over OID4VCI');
		expect(row!.textContent).toContain('Unavailable here');
		expect(unblocked.textContent).not.toContain('Unavailable here');
	});

	it('opens the profiles panel with the profile toggles', async () => {
		render(Page, { data: { blocked: {} } });

		await page.getByRole('button', { name: 'Profiles Any' }).click();

		await expect
			.element(page.getByRole('heading', { name: 'Interoperability profiles' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('switch', { name: /OID4 Profile/ })).toBeInTheDocument();
	});
});
