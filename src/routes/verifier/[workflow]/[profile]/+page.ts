import { checklistEntriesFor, loadChecklist } from '$lib/interop/checklist-loader.js';

export const prerender = true;

export const entries = () => checklistEntriesFor('verifier');

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('verifier', params);
}
