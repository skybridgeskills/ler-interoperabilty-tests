import {
	isRunOutdated,
	type FingerprintRequirement,
	type TestRunRecord
} from '$lib/interop/index.js';

/**
 * The three view-only states the reopen route can be in:
 * - `not-found`  — no run with this id (cleared, or from another device).
 * - `outdated`   — the run scored against a checklist that has since drifted.
 * - `render`     — a valid, current run to repaint.
 */
export type ReopenState = 'not-found' | 'outdated' | 'render';

/**
 * Pure branch selection for `/runs/[id]`, extracted so the precedence
 * (not-found → outdated → render) is unit-testable without mounting the route.
 */
export function reopenStateFor(
	record: TestRunRecord | undefined,
	currentRequirements: FingerprintRequirement[]
): ReopenState {
	if (!record) return 'not-found';
	if (isRunOutdated(record, currentRequirements)) return 'outdated';
	return 'render';
}
