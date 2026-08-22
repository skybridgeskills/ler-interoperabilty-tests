import { redirect } from '@sveltejs/kit';

import { resolve } from '$app/paths';

/**
 * `/wallet/credential-acceptance/vcalm` is now a scenario — `vcalm-wallet-acceptance` says in data
 * everything this bespoke page used to say in code — so this route is a
 * permanent redirect to it.
 *
 * **The query string is preserved**, because this route carries attach links:
 * an acceptance attach link carries `?exchangeId=…&workflow=claim`. The scenario route parses them with the same
 * `attachParamsFromUrl` the page used to, and adopts the exchange into step 1.
 *
 * That is the rule the whole migration followed, stated once: **redirect iff the
 * route carries documented attach links; otherwise delete outright.** The
 * verifier and issuer routes carried none, so they were deleted; these three and
 * the oid4 acceptance route carried them, so they redirect.
 *
 * `resolve()` keeps the target base-path aware, matching the house pattern in
 * `route-hrefs.ts`.
 */
export function load({ url }: { url: URL }) {
	redirect(
		308,
		`${resolve('/scenarios/[slug]', { slug: 'vcalm-wallet-acceptance' })}${url.search}`
	);
}
