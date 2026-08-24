// The component is measured, so it needs the real stylesheet — the `client`
// Vitest project does not load one, unlike the `storybook` project.
import '../../../../../routes/layout.css';

import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import InteractionQrCard from './InteractionQrCard.svelte';

const OFFER_URL =
	'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer';

/** Elements whose own content legitimately scrolls, so they are not overflow. */
const CONTENT_SCROLLS = new Set(['INPUT', 'TEXTAREA']);

function overflowingIn(container: HTMLElement): string[] {
	return [...container.querySelectorAll('*')]
		.filter((el): el is HTMLElement => el instanceof HTMLElement)
		.filter((el) => !CONTENT_SCROLLS.has(el.tagName))
		.filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth)
		.map((el) => `${el.tagName.toLowerCase()} [${el.className}]`);
}

const urlField = () => page.getByLabelText('URL (paste into wallet)');
const copyButton = () => page.getByRole('button', { name: /Copy|Copied/ });

/**
 * Measured, not eyeballed. At 375px the URL field and the Copy button shared a
 * row and the button was squeezed to ~54px — unusable with a thumb while the
 * other hand holds a wallet. Below `sm:` they now stack, and above it they
 * still sit side by side. Both halves are pinned here because either one
 * regressing is a real defect.
 */
describe('InteractionQrCard layout', () => {
	it('stacks the URL field above the Copy button at 375px, with no overflow', async () => {
		await page.viewport(375, 812);
		const { container } = render(InteractionQrCard, {
			interactionUrl: OFFER_URL,
			headerLabel: 'Live · OID4VCI offer'
		});

		// The QR renders asynchronously; wait for it before measuring.
		await expect.element(page.getByLabelText('Interaction URL QR code')).toBeInTheDocument();

		const field = (await urlField().element()).getBoundingClientRect();
		const copy = (await copyButton().element()).getBoundingClientRect();

		expect(copy.top).toBeGreaterThanOrEqual(field.bottom);
		expect(copy.width).toBeGreaterThan(200);
		expect(overflowingIn(container)).toEqual([]);
	});

	it('restores the side-by-side row at tablet width and up', async () => {
		await page.viewport(768, 1024);
		const { container } = render(InteractionQrCard, {
			interactionUrl: OFFER_URL,
			headerLabel: 'Live · OID4VCI offer'
		});

		await expect.element(page.getByLabelText('Interaction URL QR code')).toBeInTheDocument();

		const field = (await urlField().element()).getBoundingClientRect();
		const copy = (await copyButton().element()).getBoundingClientRect();

		expect(copy.left).toBeGreaterThan(field.right - 1);
		expect(overflowingIn(container)).toEqual([]);
	});
});
