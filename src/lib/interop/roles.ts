import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

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
		blurb: z.string()
	})
);
export type Role = ReturnType<typeof Role>;

/** Canonical ordered list of roles. The order is the navigation order. */
export const allRoles: Role[] = [
	Role({
		slug: 'issuer',
		name: 'Issuer',
		plural: 'Issuers',
		blurb: 'Create, sign, and deliver verifiable credentials that represent learners’ achievements.'
	}),
	Role({
		slug: 'wallet',
		name: 'Wallet',
		plural: 'Wallets',
		blurb:
			'Receive credentials from issuers on the holder’s behalf, store them, and present them to verifiers when requested.'
	}),
	Role({
		slug: 'verifier',
		name: 'Verifier',
		plural: 'Verifiers',
		blurb:
			'Request credentials from holders, verify their integrity, status, and issuer authority, and act on the result.'
	})
];
