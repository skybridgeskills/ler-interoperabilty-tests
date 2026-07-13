import { loadChecklist } from '$lib/interop/checklist-loader.js';

// Every wallet workflow×profile combo now has its own concrete runnable route
// (`credential-acceptance/{vcalm,oid4}`, `credential-presentation/{vcalm,oid4}`),
// each `prerender = false`. Those shadow this dynamic route by specificity, so it
// prerenders nothing — it stays as an SSR fallback (rendered on demand) for any
// future wallet combo that has no concrete route yet. Kept (not deleted) because
// `checklist-href.ts` resolves `/wallet/[workflow]/[profile]` via typed `resolve()`.
export const prerender = false;

export function load({ params }: { params: { workflow: string; profile: string } }) {
	return loadChecklist('wallet', params);
}
