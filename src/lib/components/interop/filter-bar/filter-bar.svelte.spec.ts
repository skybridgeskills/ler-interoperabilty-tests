// Measured components need the real stylesheet; the `client` project loads none.
import '../../../../routes/layout.css';

import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import type { AdditiveProfileSlug, ProfileSlug, RoleSlug } from '$lib/interop/index.js';

import FilterBar from './FilterBar.svelte';

/**
 * The filter bar's keyboard and focus behaviour.
 *
 * The panel is a **non-modal** disclosure, so the contract is not a focus trap:
 * opening hands focus to the panel, and focus leaving it — by Tab, by click, or
 * by Escape — closes it. These need a real browser, because `focusin`/`focusout`
 * do not fire at all unless the document genuinely holds system focus.
 */

/** Props with no selection made and both filtering dimensions available. */
function props(overrides: Record<string, unknown> = {}) {
	return {
		roles: new Set<RoleSlug>(),
		profiles: new Set<ProfileSlug>(),
		additives: new Set<AdditiveProfileSlug>(),
		onToggleRole: () => {},
		onToggleProfile: () => {},
		onToggleAdditive: () => {},
		onClear: () => {},
		matched: 4,
		hidden: 0,
		...overrides
	};
}

const panel = () => document.getElementById('filter-panel');
const rolesTrigger = () => page.getByRole('button', { name: /^Roles/ });
const profilesTrigger = () => page.getByRole('button', { name: /^Profiles/ });

/**
 * The three Vitest projects run in parallel, two driving a real browser, and
 * `turbo validate` runs a Vite build alongside them — enough load to trip the
 * default timeout on real clicks and key presses. Same allowance the sibling
 * component and route specs already take.
 */
const UNDER_LOAD = { timeout: 20_000 };

describe('FilterBar panel focus', UNDER_LOAD, () => {
	it('moves focus into the panel when it opens', async () => {
		render(FilterBar, props());

		await rolesTrigger().click();

		await expect.poll(() => document.activeElement).toBe(panel());
		expect(panel()?.getAttribute('aria-label')).toBe('Roles filter');
		// Focusable programmatically, but never a tab stop of its own.
		expect(panel()?.getAttribute('tabindex')).toBe('-1');
	});

	it('does not steal focus back when a card inside the panel is used', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		const card = page.getByRole('switch', { name: /Wallets/ });
		await card.click();

		// The panel stays open and focus stays on the card — re-focusing the
		// container on every re-render would throw the operator out of the grid.
		expect(panel()).not.toBeNull();
		await expect.poll(() => panel()?.contains(document.activeElement)).toBe(true);
		expect(document.activeElement).not.toBe(panel());
	});

	it('closes when Tab takes focus out of the panel', async () => {
		render(FilterBar, props());
		// The homepage has content after the bar, so tabbing off the last card lands
		// on a real element. Standing in for it here: without one, Tab leaves the
		// document entirely and `relatedTarget` is null, which is the Alt-Tab case
		// the handler deliberately ignores.
		const after = document.createElement('button');
		after.textContent = 'Next thing on the page';
		document.body.append(after);

		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		// Walk forward past every control in the panel; the tab after the last one
		// leaves the widget, and that is what closes it.
		const stops = panel()!.querySelectorAll('button, a[href]').length;
		for (let i = 0; i <= stops; i++) await userEvent.tab();

		await expect.poll(() => panel()).toBeNull();
		expect(document.activeElement).toBe(after);
		after.remove();
	});

	it('closes when focus moves to a control outside the widget', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		const outside = document.createElement('button');
		outside.textContent = 'Elsewhere';
		document.body.append(outside);
		outside.focus();

		await expect.poll(() => panel()).toBeNull();
		outside.remove();
	});

	it('closes when focus moves to a sibling dimension’s trigger', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		(await profilesTrigger().element()).focus();

		// A different dimension is outside this disclosure, so its panel closes;
		// clicking that trigger then opens its own.
		await expect.poll(() => panel()).toBeNull();
	});

	it('stays open when focus returns to its own trigger, so the trigger can toggle it', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		// A pointer press moves focus before the click fires. If focusout closed the
		// panel here, the click would find it shut and reopen it — the toggle would
		// stop working. This asserts the race is not there.
		await rolesTrigger().click();

		await expect.poll(() => panel()).toBeNull();
		await expect.element(rolesTrigger()).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes on Escape and returns focus to the trigger that opened it', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		await userEvent.keyboard('{Escape}');

		await expect.poll(() => panel()).toBeNull();
		await expect.poll(() => document.activeElement).toBe(await rolesTrigger().element());
	});

	it('hands focus to the next panel when a different dimension is opened', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => panel()?.getAttribute('aria-label')).toBe('Roles filter');

		await profilesTrigger().click();

		await expect.poll(() => panel()?.getAttribute('aria-label')).toBe('Profiles filter');
		await expect.poll(() => document.activeElement).toBe(panel());
	});
});
