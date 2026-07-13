// The reopen route repaints a run from localStorage, which only exists in the
// browser. There is nothing to prerender (the id is unknown at build time) and
// nothing meaningful to render on the server, so this route is client-only.
export const prerender = false;
export const ssr = false;
