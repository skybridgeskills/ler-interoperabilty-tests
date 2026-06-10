import type { BadgeVariant } from '$lib/components/ui/badge/index.js';
import type { ChecklistRequirement } from '$lib/interop/index.js';

/**
 * All requirement conformance levels (RFC 2119) render in the blue
 * `requirement` token family — red is reserved for actual run failures.
 * Every level uses the same `requirement` badge variant; the three levels
 * are distinguished by intensity (see {@link requirementLevelClass}).
 */
export const requirementLevelVariant: Record<ChecklistRequirement['level'], BadgeVariant> = {
	MUST: 'requirement',
	SHOULD: 'requirement',
	MAY: 'requirement'
};

/**
 * Per-level intensity overlaid on the `requirement` badge variant. MUST is a
 * solid blue chip (strongest), SHOULD the soft default, MAY a quiet outline —
 * a clear MUST > SHOULD > MAY hierarchy, all in one blue family.
 */
export const requirementLevelClass: Record<ChecklistRequirement['level'], string> = {
	MUST: 'bg-requirement text-requirement-foreground border-transparent',
	SHOULD: 'bg-requirement-soft text-requirement border-requirement-border',
	MAY: 'bg-transparent text-requirement border-requirement-border'
};
