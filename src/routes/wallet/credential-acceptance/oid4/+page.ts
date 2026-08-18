import { redirect } from '@sveltejs/kit';

import { resolve } from '$app/paths';

/**
 * `/wallet/credential-acceptance/oid4` is now a scenario — `oid4-wallet-acceptance`
 * says in data everything this bespoke page used to say in code — so this route
 * is a permanent redirect to it.
 *
 * **The query string is preserved.** Attach links in the CA probe runbook carry
 * `?exchangeId=…&workflow=claim`, and the scenario route adopts them into step 1;
 * dropping the query would silently break the runbook. `resolve()` keeps the
 * target base-path aware, matching the house pattern in `checklist-href.ts`.
 *
 * The vcalm sibling (`/wallet/credential-acceptance/vcalm`) is untouched — its
 * page has no scenario yet and keeps the old runner until M12.
 */
export function load({ url }: { url: URL }) {
	redirect(308, `${resolve('/scenarios/[slug]', { slug: 'oid4-wallet-acceptance' })}${url.search}`);
}
