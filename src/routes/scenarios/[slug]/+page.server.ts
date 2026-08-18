import { type CannotServe, scenarioBySlug } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { resolveIssuingContext } from '$lib/server/domain/scenario-runner/index.js';

/**
 * Resolve blocked-ness before anything renders — D6.
 *
 * Whether this deployment can serve a scenario's pinned `(cryptosuite,
 * didMethod)` is server knowledge: only the server holds the tenant config.
 * Without this load the scenario would look runnable until the operator pressed
 * the button and got a 400 back — which reads as a wallet defect, the exact
 * confusion the runbook warns about.
 *
 * A scenario with **no** pinned intent is elective and always servable. The
 * first unservable intent wins; a scenario blocked twice is still just blocked.
 *
 * A 404 for an unknown slug is `+page.ts`'s job — this load stays silent about
 * it rather than throwing from two places.
 */
export function load({ params }: { params: { slug: string } }): { blocked?: CannotServe } {
	const scenario = scenarioBySlug(params.slug);
	if (!scenario) return {};

	const { exchangeRunnerConfig } = appContext();
	for (const step of scenario.steps) {
		const intent = step.action && 'intent' in step.action ? step.action.intent : undefined;
		if (!intent) continue;
		const resolved = resolveIssuingContext(exchangeRunnerConfig, intent);
		if (!resolved.ok) return { blocked: resolved.reason };
	}
	return {};
}
