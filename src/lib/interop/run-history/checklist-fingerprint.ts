import { additiveChecklistsForCombination, combinationFor } from '$lib/interop/accessors.js';
import type { ProfileSlug, RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';

import type { TestRunRecord } from './test-run-record.js';

/** The minimal requirement shape a fingerprint depends on. */
export type FingerprintRequirement = { id: string; level: string; text: string };

// Unit/record separators (␟ / ␞) — control characters that can't occur in the
// requirement id/level/text, so the canonical string is unambiguous.
const UNIT_SEP = '␟';
const RECORD_SEP = '␞';

/**
 * Deterministic, order-independent fingerprint of a combined checklist's
 * requirements (base + additives). Strict: any change to a requirement's
 * `id`, `level`, or `text` changes the hash. Sorting the canonical rows makes
 * it insensitive to requirement/step order. No Date/random — pure over input.
 */
export function runChecklistFingerprint(requirements: FingerprintRequirement[]): string {
	const canon = requirements
		.map((r) => `${r.id}${UNIT_SEP}${r.level}${UNIT_SEP}${r.text}`)
		.sort()
		.join(RECORD_SEP);
	return djb2Hex(canon);
}

/**
 * Flatten the requirements of a (role, workflow, profile) combination — base
 * checklist first, then each applicable additive — into a stable list callers
 * can hand to {@link runChecklistFingerprint}. Returns `[]` for an invalid
 * combination.
 */
export function combinedRequirements(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): FingerprintRequirement[] {
	const base = combinationFor(role, workflow, profile);
	if (!base) return [];

	const requirements: FingerprintRequirement[] = [];
	const collect = (steps: { requirements: FingerprintRequirement[] }[]) => {
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

/**
 * Whether a persisted run scored against a checklist that no longer matches the
 * live one — i.e. the fingerprints differ. Outdated runs are blocked from
 * sharing/rendering as authoritative until re-run (no snapshot migration).
 */
export function isRunOutdated(
	record: TestRunRecord,
	currentRequirements: FingerprintRequirement[]
): boolean {
	return record.checklistFingerprint !== runChecklistFingerprint(currentRequirements);
}

/**
 * djb2 string hash → zero-padded 8-hex-digit string. Non-cryptographic: used
 * only for equality-based drift detection, never for security.
 */
function djb2Hex(input: string): string {
	let hash = 5381;
	for (let i = 0; i < input.length; i++) {
		// hash * 33 + charCode, kept in unsigned 32-bit space.
		hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}
