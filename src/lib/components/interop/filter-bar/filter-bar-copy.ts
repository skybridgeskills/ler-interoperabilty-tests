import AppWindow from '@lucide/svelte/icons/app-window';
import Layers from '@lucide/svelte/icons/layers';
import SquarePlus from '@lucide/svelte/icons/square-plus';

import { PerspectiveCopy } from '$lib/interop/perspective/index.js';

import type { Dimension } from './filter-bar-tone.js';

/**
 * Each dimension as the bar and its panel name it: the step number, the marker
 * icon (Role `app-window` — a product, not a person; Standard Profile `layers`;
 * Add-on `square-plus`), and the panel's teaching copy.
 */
export const dimensionCopy = {
	roles: {
		step: 1,
		label: 'Roles',
		icon: AppWindow,
		description:
			'A role is the part a product plays in a credential exchange. Wallets play the holder role; the label stays “Wallet.”',
		introHeading: 'Start here — 1. Which role does the product play?',
		overviewLabel: 'How roles fit together'
	},
	profiles: {
		step: 2,
		label: 'Standard Profiles',
		icon: Layers,
		description:
			'A Standard Profile is an interoperability profile: a fixed set of standards and options that two products must share to work together.',
		introHeading: undefined,
		overviewLabel: 'All Standard Profiles'
	},
	additives: {
		step: 3,
		label: 'Add-ons',
		icon: SquarePlus,
		description:
			'An add-on layers extra requirements, such as skills data or a pinned cryptosuite, onto a Standard Profile. It never runs alone — selecting one adds its requirements to every scenario set it applies to.',
		introHeading: undefined,
		overviewLabel: 'All add-ons'
	}
} as const satisfies Record<Dimension, unknown>;

/**
 * The one note in each filter panel's footer, per Perspective. The caller
 * resolves it with `perspectiveCopy`; an unset reader sees `neutral`.
 */
export const filterPanelNotes = {
	roles: PerspectiveCopy({
		builder: 'Pick the role(s) your product plays: issuer, wallet, verifier, or some combination.',
		evaluator: 'Pick the role(s) you need a platform, vendor, or implementation to demonstrate.',
		neutral: 'Pick the role(s) the product plays: issuer, wallet, verifier, or some combination.'
	}),
	profiles: PerspectiveCopy({
		builder: 'Cover the Standard Profiles your product needs to interoperate with.',
		evaluator:
			'Pick the Standard Profiles your ecosystem requires, then ask the platform or implementation to demonstrate them.',
		neutral: 'Pick the Standard Profiles the product must interoperate with.'
	}),
	additives: PerspectiveCopy({
		builder:
			'Layer the add-ons your ecosystem mandates on top of the Standard Profiles you already cover.',
		evaluator:
			'Add the data or crypto requirements your procurement asks for, and see them inside each scenario set.',
		neutral:
			'Layer on the add-ons the ecosystem requires; their requirements appear inside each scenario set.'
	})
} satisfies Record<Dimension, PerspectiveCopy>;
