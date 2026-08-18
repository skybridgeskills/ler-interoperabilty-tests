import { error } from '@sveltejs/kit';

import { attachParamsFromUrl } from '$lib/client/exchange-runner/attach-params.js';
import type { CannotServe } from '$lib/interop/scenarios/index.js';
import { scenarioBySlug } from '$lib/interop/scenarios/index.js';

/** A live runner: it needs a transaction service, so it cannot be prerendered. */
export const prerender = false;

/**
 * The one generic scenario route. **There are no bespoke scenario pages.**
 *
 * URL reading lives here, at the route boundary, and the parsed values pass into
 * `ScenarioPage` as props — the page component is Storybook-driven and must stay
 * parameterised, not location-aware.
 *
 * The stored run is read in the page's `onMount`, not here: `scenarioRunFor`
 * touches `localStorage`, which a load function must never assume.
 */
export function load({
	url,
	params,
	data
}: {
	url: URL;
	params: { slug: string };
	data: { blocked?: CannotServe };
}) {
	const scenario = scenarioBySlug(params.slug);
	if (!scenario) error(404, 'Unknown scenario.');

	// `?workflow=` is deliberately ignored: a scenario knows its own workflow
	// from its step's action kind, so honouring the URL's version could only ever
	// contradict the scenario. The CA runbook's links may still carry it, and
	// they keep working — the parameter is simply not load-bearing here.
	const attach = attachParamsFromUrl(url);
	return {
		scenario,
		attachExchangeId: attach.exchangeId,
		blocked: data.blocked
	};
}
