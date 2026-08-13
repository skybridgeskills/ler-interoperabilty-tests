import type { CredentialRecipe } from '../credential-recipes.js';

import { minimalOb3 } from './minimal-ob3.js';

/**
 * {@link minimalOb3} with a validity period that ended in 2024. Everything else
 * about it is well-formed.
 *
 * Costs nothing to author: the dates ride in the caller-supplied `vc`, and
 * nothing between here and delivery validates the window — the signing service
 * signs it happily and the exchange completes. That is the point. **Delivery
 * succeeding is not the wallet accepting it**; a conformant wallet refuses this
 * credential privately, after our last observation point, which is why the
 * requirements that matter for it are attested rather than automatic.
 */
export const ob3Expired: CredentialRecipe = {
	id: 'ob3-expired',
	summary: 'An Open Badges credential whose validity period ended in 2024.',
	build: (args) => ({
		...minimalOb3.build(args),
		validFrom: '2023-01-01T00:00:00Z',
		validUntil: '2024-12-31T00:00:00Z'
	})
};
