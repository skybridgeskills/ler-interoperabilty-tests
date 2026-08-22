import { describe, expect, it } from 'vitest';

import { load } from './+page.ts';

/**
 * The load throws a SvelteKit `Redirect`; what matters is the status and that
 * the **query string survives**, since this route's attach links are what earned
 * it a redirect rather than a deletion.
 */
function redirectFrom(search: string): { status: number; location: string } {
	try {
		load({ url: new URL(`http://localhost/wallet/credential-presentation/oid4${search}`) });
	} catch (thrown) {
		const r = thrown as { status: number; location: string };
		return { status: r.status, location: r.location };
	}
	throw new Error('load did not redirect');
}

describe('/wallet/credential-presentation/oid4 redirect', () => {
	it('permanently redirects to the scenario', () => {
		const { status, location } = redirectFrom('');
		expect(status).toBe(308);
		expect(location).toBe('/scenarios/oid4-wallet-presentation');
	});

	it('preserves attach params, so the runbook keeps working', () => {
		const { location } = redirectFrom('?exchangeId=probe-1&workflow=verify');
		expect(location).toBe('/scenarios/oid4-wallet-presentation?exchangeId=probe-1&workflow=verify');
	});
});
