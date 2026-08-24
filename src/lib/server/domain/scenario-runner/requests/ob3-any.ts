import { suiteVerifyDefaults } from '../../exchange-runner/verify-defaults.js';
import type { PresentationRequest } from '../presentation-requests.js';

/**
 * Ask for any Open Badges 3.0 credential, with no further constraint — the
 * request every presentation scenario starts from.
 *
 * Built from `suiteVerifyDefaults` rather than restating it, so the OB3 context
 * URL stays in one place alongside the credential fixtures it has to match: the
 * transaction service's QueryByExample selects on it.
 */
export const ob3Any: PresentationRequest = {
	id: 'ob3-any',
	summary: 'Any Open Badges 3.0 credential.',
	vprCredentialType: suiteVerifyDefaults.vprCredentialType,
	vprContext: suiteVerifyDefaults.vprContext
};
