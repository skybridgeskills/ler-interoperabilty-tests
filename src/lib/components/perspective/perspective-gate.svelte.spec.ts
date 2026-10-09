import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import PerspectiveGate from './PerspectiveGate.svelte';

/**
 * `pnpm turbo validate` runs the production build beside the browser projects —
 * enough load to trip the default timeout on real clicks. Same allowance the
 * sibling component and route specs take.
 */
const UNDER_LOAD = { timeout: 20_000 };

describe('PerspectiveGate', UNDER_LOAD, () => {
	it('renders nothing when the reader has decided', async () => {
		render(PerspectiveGate, { open: false, onChoose: () => {}, onDismiss: () => {} });
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('asks the question, labelled by its title, with focus inside', async () => {
		render(PerspectiveGate, { open: true, onChoose: () => {}, onDismiss: () => {} });
		const dialog = page.getByRole('dialog', { name: 'How are you using LER Tests?' });
		await expect.element(dialog).toBeInTheDocument();
		await expect.poll(() => dialog.element().contains(document.activeElement)).toBe(true);
	});

	it('choosing reports the Perspective and does not count as a dismissal', async () => {
		const onChoose = vi.fn();
		const onDismiss = vi.fn();
		const screen = render(PerspectiveGate, { open: true, onChoose, onDismiss });
		await page.getByRole('button', { name: /Building/ }).click();
		expect(onChoose).toHaveBeenCalledWith('builder');
		await screen.rerender({ open: false, onChoose, onDismiss });
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('Escape is Not now', async () => {
		const onDismiss = vi.fn();
		render(PerspectiveGate, { open: true, onChoose: () => {}, onDismiss });
		await expect.element(page.getByRole('dialog')).toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it('Not now dismisses', async () => {
		const onDismiss = vi.fn();
		render(PerspectiveGate, { open: true, onChoose: () => {}, onDismiss });
		await page.getByRole('button', { name: 'Not now' }).click();
		expect(onDismiss).toHaveBeenCalled();
	});
});
