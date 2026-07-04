import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

// Runnable verifier combos are shadowed by their own runnable routes (dynamic at request time).
// Exclude them from prerender entries so SvelteKit doesn't try to bake a static copy at the same
// path (mirrors the wallet dynamic route).
const RUNNABLE_VERIFIER_COMBOS = [
	{ workflow: 'direct-credential-verification', profile: 'ob3-direct-delivery' },
	{ workflow: 'credential-request-and-verification', profile: 'oid4' }
];

export const entries = () =>
	checklistEntriesFor('verifier').filter(
		(e) =>
			!RUNNABLE_VERIFIER_COMBOS.some((c) => c.workflow === e.workflow && c.profile === e.profile)
	);

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('verifier', params);
}
