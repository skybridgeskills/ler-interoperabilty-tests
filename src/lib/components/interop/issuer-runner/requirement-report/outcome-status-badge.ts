import type { CheckOutcome as CheckOutcomeType } from '$lib/server/domain/issuer-runner/check-outcome.js';

/**
 * Visual style + label for one outcome row in `RequirementReport`.
 *
 * Pure mapping function, no Svelte involvement, so it's directly
 * unit-testable.
 */
export function outcomeBadge(outcome: CheckOutcomeType): { label: string; className: string } {
	const { status, level } = outcome;
	if (status === 'pass') {
		return { label: 'PASS', className: 'bg-primary/10 text-primary border-primary/40' };
	}
	if (status === 'warn') {
		return { label: 'WARN', className: 'bg-amber-500/10 text-amber-500 border-amber-500/40' };
	}
	if (status === 'n/a') {
		return { label: 'N/A', className: 'bg-muted text-muted-foreground border-border' };
	}
	// fail — distinguish MUST from SHOULD/MAY
	if (level === 'MUST') {
		return {
			label: 'FAIL · MUST',
			className: 'bg-destructive/10 text-destructive border-destructive/40'
		};
	}
	return {
		label: `FAIL · ${level}`,
		className: 'bg-amber-500/10 text-amber-500 border-amber-500/40'
	};
}
