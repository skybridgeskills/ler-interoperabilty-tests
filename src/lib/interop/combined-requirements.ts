import { additiveChecklistsForCombination, combinationFor } from './accessors.js';
import type { ProfileSlug, RoleSlug, WorkflowSlug } from './profile-schema.js';

/**
 * One row of a combined checklist, reduced to what the per-requirement display
 * needs. Checklist-era vocabulary — this file goes when `profile.checklists`
 * does.
 */
export type CombinedRequirement = { id: string; level: string; text: string };

/**
 * Flatten a `(role, workflow, profile)` combination's requirements — base
 * checklist first, then each applicable additive — into the ordered, id-keyed
 * list the runnable pages render their status rows against. Returns `[]` for an
 * invalid combination.
 *
 * This used to live beside the run-history fingerprint, which hashed it. The
 * fingerprint is gone (a scenario's drift is derived from the scenario itself);
 * the flattening is display logic and survives with the pages that use it.
 */
export function combinedRequirements(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): CombinedRequirement[] {
	const base = combinationFor(role, workflow, profile);
	if (!base) return [];

	const requirements: CombinedRequirement[] = [];
	const collect = (steps: { requirements: CombinedRequirement[] }[]) => {
		for (const step of steps) {
			for (const r of step.requirements) {
				requirements.push({ id: r.id, level: r.level, text: r.text });
			}
		}
	};

	collect(base.checklist.steps);
	for (const { checklist } of additiveChecklistsForCombination(profile, role, workflow)) {
		collect(checklist.steps);
	}
	return requirements;
}
