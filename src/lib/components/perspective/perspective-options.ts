import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import Wrench from '@lucide/svelte/icons/wrench';

import type { Perspective } from '$lib/interop/perspective/index.js';

/**
 * The two Perspectives as every control names them. Verbs to choose ("I'm
 * building"), nouns — the domain terms — to label ("Builder"); the same icon
 * pair everywhere: wrench for Builder, clipboard-check for Evaluator.
 */
export const perspectiveOptions = [
	{
		value: 'builder',
		noun: 'Builder',
		verb: 'Building',
		switchLabel: 'I’m building',
		description: 'Testing a product you make',
		icon: Wrench
	},
	{
		value: 'evaluator',
		noun: 'Evaluator',
		verb: 'Evaluating',
		switchLabel: 'I’m evaluating',
		description: 'Judging a product someone else makes',
		icon: ClipboardCheck
	}
] as const satisfies readonly { value: Perspective; [key: string]: unknown }[];

export type PerspectiveOption = (typeof perspectiveOptions)[number];

export function perspectiveOption(perspective: Perspective): PerspectiveOption {
	return perspectiveOptions.find((o) => o.value === perspective) ?? perspectiveOptions[0];
}
