import { allScenarios, type CannotServe } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { blockedScenarios } from '$lib/server/domain/scenario-runner/index.js';

/**
 * Which scenarios this deployment cannot serve, resolved before the homepage's
 * meters render.
 *
 * The homepage is the last of the four scenario surfaces to get this. It was
 * left out while every scenario in the catalog was elective — nothing could be
 * blocked, so there was nothing to resolve — and the DIC wallet acceptance
 * scenarios ended that by pinning a cryptosuite.
 *
 * The whole catalog is passed, not a filtered slice: the page renders every
 * completion group and the filter is a client-side concern, so narrowing here
 * would only mean the answer depended on where the reader had got to.
 *
 * The app uses `adapter-node` with no global `prerender`, so `/` is already
 * server-rendered per request and this load costs nothing.
 */
export function load(): { blocked: Record<string, CannotServe> } {
	const { exchangeRunnerConfig } = appContext();
	return { blocked: blockedScenarios(exchangeRunnerConfig, allScenarios) };
}
