import type { BadgeDefinition } from './badge-schema.js';

/**
 * `criteria.narrative` — per-badge. What earning this badge requires, in general.
 * Copy only (presentation); excluded from the fingerprint.
 */
export function criteriaNarrative(badge: BadgeDefinition): string {
	return badge.criteriaSummary;
}

/**
 * `credentialSubject.narrative` — per-award. A brief generated sentence naming
 * the **set** and its **counts**, never an enumeration of scenario names: the
 * catalog grows (M10–M12) and an enumeration would be unbounded and go stale.
 *
 * The wording is honest against the scenario model — the quiz's right answer is
 * concealed until committed, so *"Passed"* is earned, not self-asserted.
 */
export function awardNarrative(args: {
	badge: BadgeDefinition;
	requirementsMet: number;
	requirementsTotal: number;
	scenarioCount: number;
	claimedAt: string; // ISO
}): string {
	const date = formatDay(args.claimedAt);
	return `Passed the ${args.badge.name} set — ${args.requirementsMet} of ${args.requirementsTotal} requirements across ${args.scenarioCount} scenarios, on ${date}.`;
}

/**
 * An ISO timestamp as a short, locale-stable day — `"3 Aug 2026"`. Formatted in
 * UTC so the day never shifts with the reader's timezone (the claim date is a
 * fact about the credential, not about where it is read). Falls back to the
 * raw input if it is not a parseable date.
 *
 * Exported so the claimed-badge UI (`pages/badge`, and the completion group's
 * claimed state) renders the same day the narrative embeds.
 */
export function formatDay(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(date);
}
