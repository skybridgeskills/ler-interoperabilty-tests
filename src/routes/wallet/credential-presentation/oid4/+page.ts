// Live OID4VP presentation runner — depends on a live verifier/wallet client,
// so it cannot be prerendered. SvelteKit's route specificity automatically
// prefers this nested route over the dynamic `/wallet/[workflow]/[profile]/`.
export const prerender = false;
