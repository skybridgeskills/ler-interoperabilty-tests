import { type Component } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import { RunnableWalletAcceptancePage } from './runnable-wallet-acceptance/index.js';
import { RunnableWalletPresentationPage } from './runnable-wallet-presentation/index.js';

/**
 * Attach mode across all four runnable wallet routes: given `?exchangeId=`, the
 * page adopts an externally-minted exchange — reading that exchange's
 * protocols, presenting the one link its profile speaks, and offering no way to
 * mint. Both page components are exercised here rather than in their own
 * folders because the invariant ("adopt, never mint") is one invariant, and it
 * is worth reading as one table.
 */

type AttachProps = {
	profile: 'vcalm' | 'oid4';
	attachExchangeId?: string;
	attachWorkflow?: 'claim' | 'verify';
};

const IU = 'http://svc.test/interactions/probe-1?iuv=1';
const OID4VCI = 'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Fsvc.test%2Foffer';
const OID4VP = 'openid4vp://?client_id=svc.test&request_uri=http%3A%2F%2Fsvc.test%2Frequest';

/** The protocols object the adopt route hands back — a superset, as the real one is. */
const PROTOCOLS = {
	iu: IU,
	vcapi: 'http://svc.test/workflows/claim/exchanges/probe-1',
	OID4VCI,
	OID4VP,
	verifiablePresentationRequest: {}
};

type Case = {
	name: string;
	page: Component<AttachProps>;
	profile: 'vcalm' | 'oid4';
	workflow: 'claim' | 'verify';
	expectedUrl: string;
	expectedHeader: string;
};

const cases: Case[] = [
	{
		name: 'acceptance × vcalm',
		page: RunnableWalletAcceptancePage as Component<AttachProps>,
		profile: 'vcalm',
		workflow: 'claim',
		expectedUrl: IU,
		expectedHeader: 'Live · interaction URL'
	},
	{
		name: 'acceptance × oid4',
		page: RunnableWalletAcceptancePage as Component<AttachProps>,
		profile: 'oid4',
		workflow: 'claim',
		expectedUrl: OID4VCI,
		expectedHeader: 'Live · OID4VCI offer'
	},
	{
		name: 'presentation × vcalm',
		page: RunnableWalletPresentationPage as Component<AttachProps>,
		profile: 'vcalm',
		workflow: 'verify',
		expectedUrl: IU,
		expectedHeader: 'Live · interaction URL'
	},
	{
		name: 'presentation × oid4',
		page: RunnableWalletPresentationPage as Component<AttachProps>,
		profile: 'oid4',
		workflow: 'verify',
		expectedUrl: OID4VP,
		expectedHeader: 'Live · OID4VP request'
	}
];

/**
 * Serve the adopt route, and hold the exchange at `pending` on every poll tick
 * so the assertions see the state attach itself produced. Returns the URLs the
 * page asked for, newest last.
 */
function stubRunnerApi(): string[] {
	const seen: string[] = [];
	vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
		const url = String(input);
		seen.push(url);
		if (url.includes('/protocols')) {
			return Promise.resolve(
				jsonResponse({ exchangeId: 'probe-1', workflowId: 'claim', protocols: PROTOCOLS })
			);
		}
		const stepCount = Number(new URL(url, 'http://localhost').searchParams.get('stepCount') ?? 5);
		return Promise.resolve(
			jsonResponse({
				exchange: { exchangeId: 'probe-1', state: 'pending' },
				derived: {
					run: 'awaiting-wallet',
					perStep: Array.from({ length: stepCount }, (_, i) => (i === 0 ? 'in-flight' : 'pending'))
				}
			})
		);
	});
	return seen;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

/** The single protocol link the panel presents, in its copyable input. */
const presentedUrl = () => page.getByLabelText('URL (paste into wallet)');

/** Locator count without waiting — used to assert an affordance is absent. */
const countOf = (name: string) => page.getByRole('button', { name }).elements().length;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe.each(cases)(
	'attach mode — $name',
	({ page: Page, profile, workflow, expectedUrl, expectedHeader }) => {
		const attachProps: AttachProps = {
			profile,
			attachExchangeId: 'probe-1',
			attachWorkflow: workflow
		};

		it('adopts the exchange named in the URL and presents its link', async () => {
			const seen = stubRunnerApi();

			render(Page, attachProps);

			await expect.element(presentedUrl()).toHaveValue(expectedUrl);
			expect(seen[0]).toBe(`/api/exchange-runner/probe-1/protocols?workflow=${workflow}`);
			await expect.element(page.getByText(expectedHeader)).toBeInTheDocument();
		});

		it('offers no mint action — no initiate, no retry, no reset', async () => {
			stubRunnerApi();

			render(Page, attachProps);

			await expect.element(presentedUrl()).toHaveValue(expectedUrl);
			expect(countOf('Initiate exchange')).toBe(0);
			expect(countOf('Retry')).toBe(0);
			expect(countOf('Run again')).toBe(0);
		});

		it('explains why instead of showing a dead button while the protocols load', async () => {
			// `fetch` never settles: this is the mount window, before attach resolves.
			vi.stubGlobal('fetch', () => new Promise<Response>(() => {}));

			render(Page, attachProps);

			await expect.element(page.getByText('Attached to an external exchange')).toBeInTheDocument();
			expect(countOf('Initiate exchange')).toBe(0);
		});

		it('surfaces an adopt failure through the existing error affordance, with no retry', async () => {
			vi.stubGlobal('fetch', () =>
				Promise.resolve(
					jsonResponse({ code: 404, message: 'Transaction service responded 404' }, 404)
				)
			);

			render(Page, attachProps);

			await expect.element(page.getByText('Transaction service responded 404')).toBeInTheDocument();
			expect(countOf('Retry')).toBe(0);
		});

		it('still mints when no exchangeId is supplied', async () => {
			stubRunnerApi();

			render(Page, { profile });

			await expect.element(page.getByRole('button', { name: 'Initiate exchange' })).toBeVisible();
			expect(page.getByText('Attached to an external exchange').elements()).toHaveLength(0);
		});
	}
);
