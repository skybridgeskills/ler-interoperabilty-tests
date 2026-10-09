import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import { perspectiveContext } from '$lib/client/perspective/index.js';

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
	// Past the inline first step, which has its own spec below.
	beforeEach(() => {
		sessionStorage.setItem('lits.filterIntro', 'done');
		localStorage.removeItem('lits.selection.v1');
	});

	it('renders the console heading, the filter bar, and the completion groups', async () => {
		render(Page, { props: { data: { blocked: {} } }, context: perspectiveContext() });

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toHaveTextContent('LER Interoperability Test Suite');

		// The hero's own action, beside the Perspective switch it renders itself.
		await expect
			.element(page.getByRole('link', { name: 'About these tests' }))
			.toHaveAttribute('href', '/about');
		await expect
			.element(page.getByRole('radiogroup', { name: 'Building or evaluating?' }))
			.toBeInTheDocument();

		// The three choosers are now one filter bar. Each dimension is a trigger
		// that states its own selection; an untouched dimension reads "Any" rather
		// than rendering blank.
		await expect.element(page.getByRole('button', { name: 'Roles Any' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Standard Profiles Any' }))
			.toBeInTheDocument();

		// Add-ons are absent until a relevant role is selected — an additive layers
		// on a base profile *in a role*, so it is not offered before one is picked.
		await expect.element(page.getByRole('button', { name: /Add-ons/ })).not.toBeInTheDocument();

		// The catalog renders as completion groups: a scenario row linking to the
		// generic runner (not a bespoke page).
		await expect
			.element(page.getByRole('link', { name: 'Accept a well-formed credential over OID4VCI' }))
			.toHaveAttribute('href', '/scenarios/oid4-wallet-acceptance');
	});

	it('opens the roles panel with the role toggles and their docs links', async () => {
		render(Page, { props: { data: { blocked: {} } }, context: perspectiveContext() });

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

		const { container: unblocked } = render(Page, {
			props: { data: { blocked: {} } },
			context: perspectiveContext()
		});
		const { container: withBlocked } = render(Page, {
			props: { data: { blocked } },
			context: perspectiveContext()
		});

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

	it('opens the Standard Profiles panel with the profile toggles', async () => {
		render(Page, { props: { data: { blocked: {} } }, context: perspectiveContext() });

		await page.getByRole('button', { name: 'Standard Profiles Any' }).click();

		await expect
			.element(page.getByRole('heading', { name: 'Standard Profiles' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('switch', { name: /^OID4/ })).toBeInTheDocument();
	});
});

describe('/+page.svelte — guidance', () => {
	beforeEach(() => {
		sessionStorage.removeItem('lits.filterIntro');
		localStorage.removeItem('lits.selection.v1');
	});

	it('opens the inline first step for an empty selection in a new session', async () => {
		render(Page, { props: { data: { blocked: {} } }, context: perspectiveContext() });
		await expect
			.element(page.getByRole('heading', { name: /Start here — 1. Which role/ }))
			.toBeInTheDocument();
		await page.getByRole('button', { name: /^Skip — show all/ }).click();
		expect(sessionStorage.getItem('lits.filterIntro')).toBe('done');
	});

	it('names the gap and offers Remove buttons when nothing matches', async () => {
		localStorage.setItem(
			'lits.selection.v1',
			JSON.stringify({ roles: ['wallet'], profiles: ['ob3-direct-delivery'], additiveProfiles: [] })
		);
		render(Page, { props: { data: { blocked: {} } }, context: perspectiveContext() });
		await expect
			.element(page.getByText('No Wallet scenario set for OB 3.0 Direct Delivery yet.'))
			.toBeInTheDocument();
		await page.getByRole('button', { name: 'Remove Wallets' }).click();
		await expect
			.element(page.getByText('No Wallet scenario set for OB 3.0 Direct Delivery yet.'))
			.not.toBeInTheDocument();
	});
});
