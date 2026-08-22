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
/** Exact name: the backdrop's label is "Close filter panel", and must not match. */
const closeControl = () => page.getByRole('button', { name: 'Close', exact: true });
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

	it('gives the panel a close control big enough to hit', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		// The glyph this replaced measured 7.8 × 16.8px. WCAG 2.2 §2.5.8 asks for
		// 24 × 24; the control ships at 40 × 40. The floor is asserted rather than the
		// exact size, so a later size tweak does not fail spuriously — and so a read
		// taken mid-entry-animation, scaled by 0.98, still passes.
		const close = await closeControl().element();
		const box = close.getBoundingClientRect();
		expect(box.width).toBeGreaterThanOrEqual(36);
		expect(box.height).toBeGreaterThanOrEqual(36);
	});

	it('closes from the panel’s own control and returns focus to the trigger', async () => {
		render(FilterBar, props());
		await rolesTrigger().click();
		await expect.poll(() => document.activeElement).toBe(panel());

		await closeControl().click();

		// Focus return here used to work only because `onclick={onClose}` handed
		// `close()` a MouseEvent, and a MouseEvent is truthy where a boolean was
		// expected. This is the guard on that.
		await expect.poll(() => panel()).toBeNull();
		await expect.poll(() => document.activeElement).toBe(await rolesTrigger().element());
	});

	it('keeps the notch centred on its trigger when the bar re-wraps', async () => {
		// The notch is positioned from a measured `getBoundingClientRect()`, which is
		// not reactive. Two mechanisms keep it honest, and this covers the one no label
		// change can reach: a `ResizeObserver` on the widget, for viewport resizes and
		// the bar re-wrapping onto another row.
		//
		// It has to be the **last** trigger: wrapping moves a left-aligned trigger's
		// `top`, not its `left`, unless the trigger is the one that jumps to the start
		// of the next row. Add-ons is that trigger, and it only exists once a role that
		// offers one is selected.
		render(FilterBar, props({ roles: new Set<RoleSlug>(['wallet']) }));

		await page.getByRole('button', { name: /^Add-ons/ }).click();
		await expect.poll(() => document.activeElement).toBe(panel());

		const openTrigger = () => document.querySelector('button[aria-expanded="true"]') as HTMLElement;
		const offset = () => {
			const notch = panel()!.querySelector('span[aria-hidden="true"][style*="left"]');
			const n = (notch!.firstElementChild as HTMLElement).getBoundingClientRect();
			const t = openTrigger().getBoundingClientRect();
			return Math.abs(n.left + n.width / 2 - (t.left + t.width / 2));
		};

		// The runner's iframe is narrower than the bar's one-row width, so widen the
		// container the component was rendered into before measuring anything: the
		// point of the test is the transition from one row to two.
		const container = panel()!.parentElement!.parentElement as HTMLElement;
		container.style.width = '1000px';
		await expect.poll(offset).toBeLessThan(1);
		const before = openTrigger().getBoundingClientRect().left;

		container.style.width = '320px';

		// Guard against a vacuous pass: if the trigger never moved horizontally, a
		// stale anchor would still be centred and this test would prove nothing.
		await expect
			.poll(() => Math.abs(openTrigger().getBoundingClientRect().left - before))
			.toBeGreaterThan(1);
		await expect.poll(offset).toBeLessThan(1);
		container.style.width = '';
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
