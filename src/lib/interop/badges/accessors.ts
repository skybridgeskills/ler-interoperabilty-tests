import { scenariosFor } from '$lib/interop/scenarios/accessors.js';
import type { Scenario } from '$lib/interop/scenarios/scenario-schema.js';

import { badgeKey, type BadgeDefinition } from './badge-schema.js';

/**
 * The scenarios behind a badge — the completion set it is claimed against.
 * Reuses the catalog accessor over the badge's `(profile, role)` key; invents no
 * second membership mechanism.
 */
export function scenariosBehindBadge(badge: BadgeDefinition): Scenario[] {
	const { profile, role } = badgeKey(badge);
	return scenariosFor(profile, role);
}

/**
 * Every requirement id in the badge's set, sorted so member order cannot perturb
 * a snapshot's `requirementIds` or the "k new since" diff.
 */
export function requirementIdsBehindBadge(badge: BadgeDefinition): string[] {
	return scenariosBehindBadge(badge)
		.flatMap((scenario) => scenario.steps.flatMap((step) => step.requirements.map((r) => r.id)))
		.sort();
}
