import type {
	CannotServe,
	IssuingIntent,
	Scenario,
	ScenarioStep
} from '$lib/interop/scenarios/index.js';

import type { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import { resolveIssuingContext } from './resolve-issuing-context.js';

/**
 * Whether this deployment can serve one scenario, and why not if it cannot.
 *
 * A scenario is blocked when **any** step's action pins an `IssuingIntent` this
 * deployment has no tenant for; the first unservable intent wins, because a
 * scenario blocked twice is still just blocked. A scenario with no pinned intent
 * is never blocked — elective is always servable, since the deployment's own
 * tenant answers and it always can.
 *
 * Blocked-ness is **server knowledge**: only the server holds the tenant map.
 * Every surface that renders a scenario resolves it here, before anything
 * renders — a meter that fills in and then retracts a row is worse than one that
 * is right the first time.
 *
 * Note what this does *not* do: a blocked scenario keeps its requirements in the
 * completion denominator. Blocked-ness buys **legibility** — a row that explains
 * itself instead of looking like unfinished homework — not arithmetic.
 */
export function blockedScenario(
	config: ExchangeRunnerConfig,
	scenario: Scenario
): CannotServe | undefined {
	for (const step of scenario.steps) {
		const intent = intentOf(step);
		if (!intent) continue;
		const resolved = resolveIssuingContext(config, intent);
		if (!resolved.ok) return resolved.reason;
	}
	return undefined;
}

/**
 * Every scenario in a list this deployment cannot serve, keyed by slug.
 *
 * Servable scenarios are **absent** rather than present-and-undefined, because
 * the completion model reads this as `blocked?: Record<string, CannotServe>` and
 * a key's presence is the whole signal.
 *
 * Four surfaces share this — the scenario page, the badge page, the homepage and
 * the profile page — so that "which scenarios are unavailable here" has exactly
 * one answer no matter where a reader is standing.
 */
export function blockedScenarios(
	config: ExchangeRunnerConfig,
	scenarios: Scenario[]
): Record<string, CannotServe> {
	const blocked: Record<string, CannotServe> = {};
	for (const scenario of scenarios) {
		const reason = blockedScenario(config, scenario);
		if (reason) blocked[scenario.slug] = reason;
	}
	return blocked;
}

/**
 * The pinned intent a step carries, if its action kind carries one at all.
 *
 * `issue` and `deliver-direct` are the two that mint; every other action kind
 * consumes something the operator produced, so there is nothing to pin.
 */
function intentOf(step: ScenarioStep): IssuingIntent | undefined {
	return step.action && 'intent' in step.action ? step.action.intent : undefined;
}
