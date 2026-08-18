import type { Requirement } from './requirement-schema.js';
import type { Scenario, ScenarioStep } from './scenario-schema.js';

// Separator hierarchy — control characters that cannot occur in any authored
// field, so the canonical string is unambiguous at every nesting level.
const UNIT_SEP = '␟'; // between fields of one requirement
const RECORD_SEP = '␞'; // between requirements
const GROUP_SEP = '␝'; // between fields of one step
const FILE_SEP = '␜'; // between steps

/**
 * Deterministic fingerprint of a scenario's **scoring-relevant content**, used
 * to detect that a stored result no longer describes the scenario that produced
 * it. A mismatch **drops** the record; there is no stale state and no
 * "outdated, must re-run" UI.
 *
 * Derived rather than declared because a hand-maintained version fails
 * *dishonestly*: an author edits a right answer, forgets to bump, and a stored
 * `passed` now claims a correct answer to a question that changed.
 *
 * **Included** — everything a result is scored against:
 *
 * - each requirement's `id`, `level` and `statement`
 * - each requirement's check kind, and its `checkId` or answer kind
 * - a `choose` answer's options (value *and* label) and its `correct` value
 * - each step's `action`, in full, and whether it is shuffled
 *
 * **Excluded** — cosmetic fields, so copy-editing never costs anyone their
 * results: the scenario's `name` and `blurb`, and each step's `id`, `title` and
 * `summary`. Step ids are safe to exclude because nothing persisted keys on
 * them — result outcomes key on requirement ids.
 *
 * Option **labels** are included even though only `value` is persisted: an
 * option set whose meaning changes while its values stay the same would leave a
 * stored result quietly misleading, which is the exact dishonest failure this
 * function exists to prevent.
 *
 * Unlike the checklist fingerprint this replaces, it is **order-dependent** —
 * step order and requirement order are both scoring-relevant.
 */
export function scenarioFingerprint(scenario: Scenario): string {
	return djb2Hex(scenario.steps.map(canonicalStep).join(FILE_SEP));
}

/** Canonical form of one step: shuffle flag, action, then its requirements in order. */
function canonicalStep(step: ScenarioStep): string {
	return [
		step.shuffle === true ? 'shuffle' : '-',
		step.action ? stableStringify(step.action) : '-',
		step.requirements.map(canonicalRequirement).join(RECORD_SEP)
	].join(GROUP_SEP);
}

/** Canonical form of one requirement: identity, level, question, and how it is decided. */
function canonicalRequirement(requirement: Requirement): string {
	return [
		requirement.id,
		requirement.level,
		requirement.statement,
		canonicalCheck(requirement)
	].join(UNIT_SEP);
}

function canonicalCheck(requirement: Requirement): string {
	const check = requirement.check;
	if (check.kind === 'automatic') return `automatic:${check.checkId}`;
	if (check.answer.kind === 'affirm') return 'attested:affirm';
	const options = check.answer.options.map((o) => `${o.value}=${o.label}`).join(',');
	return `attested:choose:${options}>${check.answer.correct}`;
}

/**
 * JSON with object keys sorted at every depth, so an action's canonical form
 * does not depend on the order its fields were authored in.
 */
function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
	return `{${entries.join(',')}}`;
}

/**
 * djb2 string hash → zero-padded 8-hex-digit string. Non-cryptographic: used
 * only for equality-based drift detection, never for security.
 *
 * Exported so the badge fingerprint (`interop/badges/badge-fingerprint.ts`) can
 * compose per-scenario fingerprints through the **same** hash rather than
 * reimplementing it — the badge `?v=` and the scenario drift check must stay one
 * mechanism.
 */
export function djb2Hex(input: string): string {
	let hash = 5381;
	for (let i = 0; i < input.length; i++) {
		// hash * 33 + charCode, kept in unsigned 32-bit space.
		hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}
