import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

// `verifier/direct-credential-verification/ob3-direct-delivery` is shadowed by its runnable
// route (dynamic at request time). Exclude it from prerender entries so SvelteKit doesn't try
// to bake a static copy at the same path (mirrors the wallet dynamic route).
export const entries = () =>
	checklistEntriesFor('verifier').filter(
		(e) => !(e.workflow === 'direct-credential-verification' && e.profile === 'ob3-direct-delivery')
	);

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('verifier', params);
}
