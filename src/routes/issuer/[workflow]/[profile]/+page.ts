import { loadChecklist } from '$lib/interop/checklist-loader.js';

// Every issuer × workflow × profile combination now has its own dedicated runnable route
// (credential-issuance × {vcalm,oid4} and direct-credential-issuance × ob3-direct-delivery), each
// `prerender = false` because it runs against user input at request time and SvelteKit's route
// specificity prefers it over this dynamic route. There are therefore no static issuer checklist
// pages left to prerender, so this dynamic route opts out of prerendering and serves as a runtime
// fallback only. The typed `checklistHref('issuer', …)` still resolves against this route id.
export const prerender = false;

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('issuer', params);
}
