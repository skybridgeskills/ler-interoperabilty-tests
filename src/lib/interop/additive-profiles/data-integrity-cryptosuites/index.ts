import { AdditiveProfile } from '../../additive-profile-schema.js';

import { dataIntegrityCryptosuitesMeta } from './profile.js';

/** The Data Integrity Cryptosuites additive profile, ready for use in the UI + accessors. */
export const dataIntegrityCryptosuites = AdditiveProfile({ ...dataIntegrityCryptosuitesMeta });

export { dataIntegrityCryptosuitesMeta } from './profile.js';
