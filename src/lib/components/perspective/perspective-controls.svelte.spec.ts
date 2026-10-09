import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import PerspectiveChip from './PerspectiveChip.svelte';
import PerspectiveSwitch from './PerspectiveSwitch.svelte';

describe('PerspectiveSwitch', () => {
	it('asks the question only while unset', async () => {
		const screen = render(PerspectiveSwitch, { perspective: undefined, onChange: () => {} });
		await expect.element(page.getByText('Building or evaluating?')).toBeInTheDocument();
		await screen.rerender({ perspective: 'builder', onChange: () => {} });
		await expect.element(page.getByText('Building or evaluating?')).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('radio', { name: 'I’m building' }))
			.toHaveAttribute('aria-checked', 'true');
	});

	it('moves the choice with the arrow keys, like any radio group', async () => {
		const onChange = vi.fn();
		render(PerspectiveSwitch, { perspective: 'builder', onChange });
		await page.getByRole('radio', { name: 'I’m building' }).click();
		await userEvent.keyboard('{ArrowRight}');
		expect(onChange).toHaveBeenLastCalledWith('evaluator');
	});
});

describe('PerspectiveChip', () => {
	it('names the chosen Perspective', async () => {
		render(PerspectiveChip, { perspective: 'evaluator', onChange: () => {} });
		await expect
			.element(page.getByRole('button', { name: /Evaluator/ }))
			.toHaveAttribute('aria-haspopup', 'menu');
	});

	it('repeats each one-line description in its menu', async () => {
		render(PerspectiveChip, { perspective: undefined, onChange: () => {} });
		await page.getByRole('button', { name: /Choose perspective/ }).click();
		await expect.element(page.getByText('Testing a product you make')).toBeInTheDocument();
		await expect
			.element(page.getByText('Judging a product someone else makes'))
			.toBeInTheDocument();
	});

	it('closes on Escape and returns focus to the chip', async () => {
		render(PerspectiveChip, { perspective: 'builder', onChange: () => {} });
		const chip = page.getByRole('button', { name: /Builder/ });
		await chip.click();
		await expect.element(page.getByRole('menu')).toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
		await expect.element(chip).toHaveFocus();
	});
});
