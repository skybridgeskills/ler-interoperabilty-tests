import type { Profile } from '../profile-schema.js';

import { ob3DirectDelivery } from './ob3-direct-delivery/index.js';
import { oid4Ecdsa } from './oid4-ecdsa/index.js';
import { vcalm } from './vcalm/index.js';

/** Canonical ordered list of profiles. The order is the navigation order. */
export const allProfiles: Profile[] = [vcalm, oid4Ecdsa, ob3DirectDelivery];
