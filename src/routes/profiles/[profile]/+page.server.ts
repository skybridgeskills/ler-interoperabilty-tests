import { allScenarios, type CannotServe } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { blockedScenarios } from '$lib/server/domain/scenario-runner/index.js';

/**
 * Which scenarios this deployment cannot serve, resolved before this profile's
 * meters render — the homepage's load, for the profile page.
 *
 * The whole catalog is passed rather than this profile's slice. The universal
 * load beside this one is what resolves the profile (and 404s an unknown slug),
 * and duplicating that resolution here to filter a map whose extra keys are
 * simply never read would buy nothing.
 *
 * This route was `prerender = true` until a scenario could be blocked. See the
 * comment in `+page.ts` for why it no longer can be.
 */
export function load(): { blocked: Record<string, CannotServe> } {
	const { exchangeRunnerConfig } = appContext();
	return { blocked: blockedScenarios(exchangeRunnerConfig, allScenarios) };
}
