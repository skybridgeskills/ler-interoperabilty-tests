import { PerspectiveCopy } from '$lib/interop/perspective/index.js';

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
};
