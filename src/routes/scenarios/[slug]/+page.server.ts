import { type CannotServe, scenarioBySlug } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { blockedScenario } from '$lib/server/domain/scenario-runner/index.js';

/**
 * Resolve blocked-ness before anything renders — D6.
 *
 * Whether this deployment can serve a scenario's pinned `(cryptosuite,
 * didMethod)` is server knowledge: only the server holds the tenant config.
 * Without this load the scenario would look runnable until the operator pressed
 * the button and got a 400 back — which reads as a wallet defect, the exact
 * confusion the runbook warns about.
 *
 * The rules — elective is always servable, first unservable intent wins — live
 * in `blockedScenario`, shared with the three other surfaces that render a
 * scenario, so none of them can drift from the others.
 *
 * A 404 for an unknown slug is `+page.ts`'s job — this load stays silent about
 * it rather than throwing from two places.
 */
export function load({ params }: { params: { slug: string } }): { blocked?: CannotServe } {
	const scenario = scenarioBySlug(params.slug);
	if (!scenario) return {};

	const { exchangeRunnerConfig } = appContext();
	return { blocked: blockedScenario(exchangeRunnerConfig, scenario) };
}
