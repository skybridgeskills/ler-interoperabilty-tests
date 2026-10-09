import { Profile } from '../../profile-schema.js';

import { vcalmProfileMeta } from './profile.js';

/** The VCALM profile, ready for use in the UI and accessors. */
export const vcalm = Profile({ ...vcalmProfileMeta });
