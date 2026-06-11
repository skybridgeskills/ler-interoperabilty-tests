import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

// `wallet/credential-acceptance/{vcalm,oid4}` are shadowed by their runnable
// routes (dynamic at request time). Exclude both from prerender entries so
// SvelteKit doesn't try to bake a static copy at the same paths.
export const entries = () =>
	checklistEntriesFor('wallet').filter(
		(e) =>
			!(e.workflow === 'credential-acceptance' && (e.profile === 'vcalm' || e.profile === 'oid4'))
	);

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('wallet', params);
}
