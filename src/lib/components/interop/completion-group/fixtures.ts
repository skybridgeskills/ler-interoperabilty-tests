import type { CompletionResult, ObligationProgress } from '$lib/interop/completion/index.js';
import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import { type CannotServe, type Scenario, scenarioBySlug } from '$lib/interop/scenarios/index.js';

/**
 * Hand-built `CompletionResult` fixtures for the `CompletionGroup` stories.
 *
 * The component is prop-driven and computes nothing, so fabricating results is
 * both fine and expected — it is how we exercise each state without running the
 * engine. Real catalog scenarios supply the names and slugs so the rows link and
 * read the way they will in production.
 */
const acceptance = scenarioBySlug('oid4-wallet-acceptance')!;
const refusal = scenarioBySlug('oid4-wallet-refusal-discrimination')!;

/** A minimal stored run — the row only reads `status` and `ranAt`. */
export function runRecord(
	slug: string,
	status: 'passed' | 'failed',
	ranAt = '2026-08-15T10:30:00.000Z'
): ScenarioRunRecord {
	return {
		scenarioSlug: slug,
		ranAt,
		fingerprint: 'fixture',
		status,
		outcomes: {},
		attempts: 1
	} as ScenarioRunRecord;
}

function scenarioProgress(
	scenario: Scenario,
	met: number,
	total: number,
	blocked?: CannotServe
): ObligationProgress {
	return {
		obligation: { kind: 'scenario', scenario, requirementIds: [] },
		met,
		total,
		...(blocked ? { blocked } : {})
	};
}

function oneOfProgress(members: Scenario[], met: number, total: number): ObligationProgress {
	return {
		obligation: { kind: 'oneOf', group: 'alt-group', members, requirementIds: [] },
		met,
		total
	};
}

function resultOf(
	obligations: ObligationProgress[],
	optional: ObligationProgress[] = []
): CompletionResult {
	const sum = (list: ObligationProgress[], key: 'met' | 'total') =>
		list.reduce((acc, p) => acc + p[key], 0);
	return {
		met: sum(obligations, 'met'),
		total: sum(obligations, 'total'),
		obligations,
		optional: {
			met: sum(optional, 'met'),
			total: sum(optional, 'total'),
			obligations: optional
		}
	};
}

const cryptosuiteBlocked: CannotServe = {
	kind: 'cryptosuite-unavailable',
	requested: 'ecdsa-sd-2023',
	available: ['bbs-2023', 'eddsa-rdfc-2022']
};

/** Nothing run yet — an empty meter with its rows waiting. */
export const emptyResult = resultOf([
	scenarioProgress(acceptance, 0, 4),
	scenarioProgress(refusal, 0, 9)
]);
export const emptyRuns: Record<string, ScenarioRunRecord> = {};

/** One passed, one partial-and-failed, plus a `oneOf` group in flight. */
export const partialResult = resultOf([
	scenarioProgress(acceptance, 4, 4),
	scenarioProgress(refusal, 5, 9),
	oneOfProgress([acceptance, refusal], 3, 9)
]);
export const partialRuns: Record<string, ScenarioRunRecord> = {
	[acceptance.slug]: runRecord(acceptance.slug, 'passed'),
	[refusal.slug]: runRecord(refusal.slug, 'failed', '2026-08-16T14:05:00.000Z')
};

/** Every requirement met — the meter fills and the badge is ready. */
export const fullResult = resultOf([
	scenarioProgress(acceptance, 4, 4),
	scenarioProgress(refusal, 9, 9)
]);
export const fullRuns: Record<string, ScenarioRunRecord> = {
	[acceptance.slug]: runRecord(acceptance.slug, 'passed'),
	[refusal.slug]: runRecord(refusal.slug, 'passed', '2026-08-16T14:05:00.000Z')
};

/** One obligation the deployment cannot serve — blocks the badge, keeps the denominator. */
export const blockedResult = resultOf([
	scenarioProgress(acceptance, 4, 4),
	scenarioProgress(refusal, 0, 9, cryptosuiteBlocked)
]);
export const blockedRuns: Record<string, ScenarioRunRecord> = {
	[acceptance.slug]: runRecord(acceptance.slug, 'passed')
};

/** A full base meter beside a partly-run optional sub-section. */
export const optionalResult = resultOf(
	[scenarioProgress(acceptance, 4, 4)],
	[scenarioProgress(refusal, 2, 9)]
);
export const optionalRuns: Record<string, ScenarioRunRecord> = {
	[acceptance.slug]: runRecord(acceptance.slug, 'passed'),
	[refusal.slug]: runRecord(refusal.slug, 'failed')
};
