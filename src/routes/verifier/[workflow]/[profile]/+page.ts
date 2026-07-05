import { loadChecklist } from '$lib/interop/checklist-loader.js';

// Every verifier (workflow, profile) combination now has its own runnable route
// that shadows this dynamic one by route specificity, so this route is not
// reached in practice. It stays only so `resolve('/verifier/[workflow]/[profile]')`
// (checklist-href) keeps resolving combo URLs to their runnable routes; it is
// rendered at request time — not prerendered — as a safety net for any future
// non-runnable verifier combo.
export const prerender = false;

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('verifier', params);
}
