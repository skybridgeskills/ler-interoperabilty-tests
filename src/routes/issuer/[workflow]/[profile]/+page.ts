import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

// `issuer/credential-issuance/{vcalm,oid4}` are shadowed by their runnable routes (dynamic at
// request time, where the test wallet runs against a user-supplied exchange/offer). Exclude them
// from prerender entries so SvelteKit doesn't try to bake a static copy at the same path.
export const entries = () =>
	checklistEntriesFor('issuer').filter(
		(e) =>
			!(e.workflow === 'credential-issuance' && (e.profile === 'vcalm' || e.profile === 'oid4'))
	);

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('issuer', params);
}
