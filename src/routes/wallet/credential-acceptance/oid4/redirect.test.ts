import { describe, expect, it } from 'vitest';

import { load } from './+page.ts';

/**
 * `/wallet/credential-acceptance/oid4` is now a permanent redirect to the
 * `oid4-wallet-acceptance` scenario. The load throws a SvelteKit `Redirect`;
 * what matters is the status and that the **query string survives** — the CA
 * probe runbook's attach links carry `?exchangeId=…&workflow=claim`, which the
 * scenario route adopts into step 1.
 */
function redirectFrom(search: string): { status: number; location: string } {
	try {
		load({ url: new URL(`http://localhost/wallet/credential-acceptance/oid4${search}`) });
	} catch (thrown) {
		const r = thrown as { status: number; location: string };
		return { status: r.status, location: r.location };
	}
	throw new Error('load did not redirect');
}

describe('/wallet/credential-acceptance/oid4 redirect', () => {
	it('permanently redirects to the scenario', () => {
		const { status, location } = redirectFrom('');
		expect(status).toBe(308);
		expect(location).toBe('/scenarios/oid4-wallet-acceptance');
	});

	it('preserves attach params, so the runbook keeps working', () => {
		const { location } = redirectFrom('?exchangeId=probe-1&workflow=claim');
		expect(location).toBe('/scenarios/oid4-wallet-acceptance?exchangeId=probe-1&workflow=claim');
	});
});
