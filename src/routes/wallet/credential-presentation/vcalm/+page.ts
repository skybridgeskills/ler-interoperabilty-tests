import { attachParamsFromUrl } from '$lib/client/exchange-runner/attach-params.js';

// Live VCALM presentation runner — depends on a live transaction service, so it
// cannot be prerendered. SvelteKit's route specificity automatically prefers
// this nested route over the dynamic `/wallet/[workflow]/[profile]/`.
export const prerender = false;

// Attach mode: `?exchangeId=…&workflow=claim|verify` makes the page adopt an
// externally-minted exchange instead of minting one. URL reading stays here at
// the route boundary; the page component takes the values as props.
export function load({ url }: { url: URL }) {
	const attach = attachParamsFromUrl(url);
	return { attachExchangeId: attach.exchangeId, attachWorkflow: attach.workflow };
}
