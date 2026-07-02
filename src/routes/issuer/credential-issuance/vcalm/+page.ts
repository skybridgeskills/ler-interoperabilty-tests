// This route drives the test wallet against a user-supplied exchange at runtime, so it cannot be
// prerendered. SvelteKit's route specificity automatically prefers this nested route over the
// dynamic `/issuer/[workflow]/[profile]/`.
export const prerender = false;
