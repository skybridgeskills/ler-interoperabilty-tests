import type { RunnerWorkflowId } from '$lib/interop/runner-state.js';

/**
 * Attach-mode parameters a runnable wallet route reads off its URL.
 *
 * Both are absent in the normal (minting) flow. `exchangeId` is what switches a
 * page into attach mode; `workflow` is optional because each page has a natural
 * workflow (acceptance → `claim`, presentation → `verify`) and only needs to be
 * told otherwise.
 */
export type AttachParams = {
	exchangeId?: string;
	workflow?: RunnerWorkflowId;
};

/**
 * Parse `?exchangeId=…&workflow=claim|verify`.
 *
 * URL reading lives at the route boundary (`+page.ts`) and the parsed values are
 * passed into the page components as props — the page components are also driven
 * by Storybook stories and must stay parameterised, not location-aware.
 */
export function attachParamsFromUrl(url: URL): AttachParams {
	const exchangeId = url.searchParams.get('exchangeId')?.trim();
	const workflow = url.searchParams.get('workflow')?.trim();
	return {
		...(exchangeId ? { exchangeId } : {}),
		...(workflow === 'claim' || workflow === 'verify' ? { workflow } : {})
	};
}
