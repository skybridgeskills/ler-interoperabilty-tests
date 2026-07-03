// This route runs the built-in verifier against a user-pasted credential at runtime, so it is not
// prerendered. SvelteKit's route specificity automatically prefers this nested route over the
// dynamic `/issuer/[workflow]/[profile]/`.
export const prerender = false;
