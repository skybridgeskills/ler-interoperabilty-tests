import type { BadgeVariant } from '$lib/components/ui/badge/index.js';
import type { ChecklistRequirement } from '$lib/interop/index.js';

/**
 * Maps a requirement conformance level (RFC 2119) to the badge variant used to
 * render it in the checklist UI.
 */
export const requirementLevelVariant: Record<ChecklistRequirement['level'], BadgeVariant> = {
	MUST: 'destructive',
	SHOULD: 'default',
	MAY: 'secondary'
};
