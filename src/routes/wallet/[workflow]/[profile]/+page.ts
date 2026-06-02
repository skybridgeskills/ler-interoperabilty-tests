import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

// `wallet/credential-acceptance/vcalm` is shadowed by the runnable
// route (which is dynamic at request time). Exclude it from prerender
// entries so SvelteKit doesn't try to bake a static copy at the same path.
export const entries = () =>
	checklistEntriesFor('wallet').filter(
		(e) => !(e.workflow === 'credential-acceptance' && e.profile === 'vcalm')
	);

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('wallet', params);
}
