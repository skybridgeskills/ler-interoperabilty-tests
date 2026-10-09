import { Profile } from '../../profile-schema.js';

import { ob3DirectDeliveryProfileMeta } from './profile.js';

/** The OB3 direct-delivery profile, ready for use in the UI and accessors. */
export const ob3DirectDelivery = Profile({ ...ob3DirectDeliveryProfileMeta });
