import type { Profile } from '../profile-schema.js';

import { ob3DirectDelivery } from './ob3-direct-delivery/index.js';
import { oid4 } from './oid4/index.js';
import { vcalm } from './vcalm/index.js';

/** Canonical ordered list of profiles. The order is the navigation order. */
export const allProfiles: Profile[] = [vcalm, oid4, ob3DirectDelivery];
