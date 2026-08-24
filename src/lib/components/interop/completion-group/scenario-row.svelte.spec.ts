// Measured components need the real stylesheet; the `client` project loads none.
import '../../../../routes/layout.css';

import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import ScenarioRow from './ScenarioRow.svelte';

/**
 * See `scenario-step.svelte.spec.ts` — real clicks under a parallel browser
 * project need the same allowance.
 */
const UNDER_LOAD = { timeout: 20_000 };

const href = '/scenarios/oid4-wallet-acceptance';

describe('ScenarioRow — the trailing arrow', UNDER_LOAD, () => {
	it('is a link to the same place as the title, not a decoration', async () => {
		const { container } = render(ScenarioRow, {
			name: 'Accept a well-formed credential',
			href,
			met: 4,
			total: 4
		});

		const anchors = [...container.querySelectorAll('a')];
		expect(anchors).toHaveLength(2);
		expect(anchors.every((a) => a.getAttribute('href') === href)).toBe(true);
		expect(anchors[1].textContent?.trim()).toBe('→');
	});

	it('costs no second tab stop — one destination, one focusable link', async () => {
		const { container } = render(ScenarioRow, {
			name: 'Accept a well-formed credential',
			href,
			met: 4,
			total: 4
		});

		const anchors = [...container.querySelectorAll('a')];
		// The title keeps the tab stop and the accessible name; the arrow is a
		// mouse affordance, which is what makes its `aria-hidden` legitimate.
		expect(anchors[0].getAttribute('tabindex')).toBeNull();
		expect(anchors[1].getAttribute('tabindex')).toBe('-1');
		expect(anchors[1].getAttribute('aria-hidden')).toBe('true');
		expect(container.querySelectorAll('a:not([tabindex="-1"])')).toHaveLength(1);
	});

	it('still exposes exactly one named link to the scenario', async () => {
		render(ScenarioRow, {
			name: 'Accept a well-formed credential',
			href,
			met: 4,
			total: 4
		});

		expect(
			page.getByRole('link', { name: 'Accept a well-formed credential' }).elements()
		).toHaveLength(1);
	});
});
