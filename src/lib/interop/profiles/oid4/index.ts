import { Profile } from '../../profile-schema.js';

import { oid4ProfileMeta } from './profile.js';

/** The OID4 profile, ready for use in the UI and accessors. */
export const oid4 = Profile({ ...oid4ProfileMeta });
