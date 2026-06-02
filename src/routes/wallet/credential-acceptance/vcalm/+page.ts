// This route depends on a live transaction service, so it cannot be
// prerendered. SvelteKit's route specificity automatically prefers this
// nested route over the dynamic `/wallet/[workflow]/[profile]/`.
export const prerender = false;
