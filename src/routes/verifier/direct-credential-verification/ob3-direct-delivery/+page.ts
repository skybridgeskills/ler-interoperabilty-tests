// This route runs the interactive verifier acceptance passes against the runner API at request
// time, so it is not prerendered. SvelteKit's route specificity automatically prefers this nested
// route over the dynamic `/verifier/[workflow]/[profile]/` (whose entries() excludes this combo).
export const prerender = false;
