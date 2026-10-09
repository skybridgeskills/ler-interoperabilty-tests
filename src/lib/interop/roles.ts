import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { PerspectiveCopy } from './perspective/perspective.js';
import { RoleSlug } from './profile-schema.js';

/**
 * One of the three product roles in an interoperable credentialing
 * ecosystem: Issuer, Wallet (holder), or Verifier.
 */
export const Role = ZodFactory(
	z.object({
		slug: RoleSlug.schema,
		name: z.string(),
		plural: z.string(),
		blurb: z.string(),
		/**
		 * One line per Perspective under this item's blurb on a filter-panel choice
		 * card — what choosing it means to a Builder or an Evaluator. No `neutral`:
		 * absent when the Perspective is unset. Required: every card has both.
		 */
		example: PerspectiveCopy.schema
	})
);
export type Role = ReturnType<typeof Role>;

/** Canonical ordered list of roles. The order is the navigation order. */
export const allRoles: Role[] = [
	Role({
		slug: 'issuer',
		name: 'Issuer',
		plural: 'Issuers',
		blurb:
			'Create, sign, and deliver verifiable credentials that represent learners’ achievements.',
		example: {
			builder: 'e.g. your badging platform or student-records system',
			evaluator: 'e.g. a credentialing platform your institution is considering'
		}
	}),
	Role({
		slug: 'wallet',
		name: 'Wallet',
		plural: 'Wallets',
		blurb:
			'Receive credentials from issuers on the holder’s behalf, store them, and present them to verifiers when requested.',
		example: {
			builder: 'e.g. your mobile or web learner wallet',
			evaluator: 'e.g. a learner wallet you might recommend to students or staff'
		}
	}),
	Role({
		slug: 'verifier',
		name: 'Verifier',
		plural: 'Verifiers',
		blurb:
			'Request credentials from holders, verify their integrity, status, and issuer authority, and act on the result.',
		example: {
			builder: 'e.g. your hiring, admissions or licensing platform',
			evaluator: 'e.g. an applicant-tracking system you are choosing for hiring'
		}
	})
];
