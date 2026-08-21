import { exchangeReachedComplete } from './checks/exchange-reached-complete.js';
import { holderDidBound } from './checks/holder-did-bound.js';
import { offerWasFetched } from './checks/offer-was-fetched.js';
import { vcalmInteractionEndpoint } from './checks/vcalm-interaction-endpoint.js';
import { vcalmRequestTls } from './checks/vcalm-request-tls.js';
import { vcalmResponseEndpoint } from './checks/vcalm-response-endpoint.js';
import { vcalmResponseTls } from './checks/vcalm-response-tls.js';
import { vcalmVprDidauth } from './checks/vcalm-vpr-didauth.js';
import { vcalmVprQuery } from './checks/vcalm-vpr-query.js';
import type { RunEvidence } from './evidence.js';

/** What a check decided, and why — the `detail` is shown beside the requirement. */
export type CheckResult = { met: boolean; detail?: string };

/**
 * A pure function over a run's evidence, resolved by `checkId` from this
 * registry.
 *
 * **This is the escape hatch, and it is deliberately a small one.** A check is a
 * function, not a page. When a scenario cannot be expressed, the fix is a new
 * `ScenarioAction` kind — reviewed once, reusable forever — never a bespoke page
 * that forks the result shape.
 *
 * A check receives the whole {@link RunEvidence}, not just its own step's, so it
 * *can* read prior steps. Nothing shipped does yet; round-trip will.
 *
 * **Do not write a check that claims to detect a wallet's private refusal.** The
 * wire cannot see one: delivery succeeds and the wallet refuses afterwards,
 * beyond our last observation point. Attesting that is the operator's job, and
 * the fact that only they can see it is the thing the quiz measures.
 */
export type AutomaticCheck = {
	id: string;
	/** One line, for authoring. */
	summary: string;
	run(args: { stepId: string; evidence: RunEvidence }): CheckResult;
};

/** Every automatic check a requirement may name, keyed by id. */
export const automaticChecks: Record<string, AutomaticCheck> = {
	[exchangeReachedComplete.id]: exchangeReachedComplete,
	[offerWasFetched.id]: offerWasFetched,
	[holderDidBound.id]: holderDidBound,
	// The VCALM verifier floor + delivery, ported from the verifier-runner engine
	// as pure functions over a `present-to-verifier` step's request/present evidence.
	[vcalmInteractionEndpoint.id]: vcalmInteractionEndpoint,
	[vcalmVprQuery.id]: vcalmVprQuery,
	[vcalmVprDidauth.id]: vcalmVprDidauth,
	[vcalmRequestTls.id]: vcalmRequestTls,
	[vcalmResponseTls.id]: vcalmResponseTls,
	[vcalmResponseEndpoint.id]: vcalmResponseEndpoint
};

/**
 * Resolve a check id, or `undefined` when nothing is registered under it. The
 * catalog is authored data and can name a check that does not exist; callers
 * surface that as a failed requirement rather than crashing a live run.
 */
export function checkById(id: string): AutomaticCheck | undefined {
	return automaticChecks[id];
}

/** Every registered check id, for error messages and authoring tools. */
export function allCheckIds(): string[] {
	return Object.keys(automaticChecks);
}
