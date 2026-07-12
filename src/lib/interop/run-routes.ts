import { checklistHref } from './checklist-href.js';
import type { ProfileSlug, RoleSlug, WorkflowSlug } from './profile-schema.js';

/**
 * The live, runnable route path for a (role, workflow, profile) combination —
 * where a run is actually driven (e.g. `/wallet/credential-acceptance/vcalm`,
 * `/issuer/direct-credential-issuance/ob3-direct-delivery`).
 *
 * Each combination has a concrete runnable route under `/{role}/{workflow}/{profile}`;
 * those shadow the dynamic `/{role}/[workflow]/[profile]` fallback by specificity,
 * so the same resolved URL string reaches the live runnable page. We therefore
 * derive the path via the shared, base-path-aware {@link checklistHref} resolver
 * rather than string-concatenating (keeps a single source of truth). Server-free:
 * it only touches `$app/paths`, which is safe in both browser and node/test.
 *
 * The reopen route (`/runs/[id]`) uses this for its "Re-run" and outdated-block
 * "go to the workflow" actions. `run-routes.test.ts` asserts every combination
 * returned by `allCombinations()` maps to a real on-disk runnable route, so a
 * missing route fails the test instead of linking to a 404.
 */
export function liveRouteFor(role: RoleSlug, workflow: WorkflowSlug, profile: ProfileSlug): string {
	return checklistHref(role, workflow, profile);
}
