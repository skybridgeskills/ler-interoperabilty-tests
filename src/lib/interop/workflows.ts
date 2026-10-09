import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { RoleSlug, WorkflowSlug } from './profile-schema.js';

/**
 * One of the six interoperability workflows. Each workflow is implemented
 * primarily by one role; the role landing pages list scenarios per workflow.
 */
export const Workflow = ZodFactory(
	z.object({
		slug: WorkflowSlug.schema,
		name: z.string(),
		role: RoleSlug.schema,
		blurb: z.string()
	})
);
export type Workflow = ReturnType<typeof Workflow>;

/** Canonical ordered list of workflows. The order pairs them by exchange. */
export const allWorkflows: Workflow[] = [
	Workflow({
		slug: 'credential-issuance',
		name: 'Credential Issuance',
		role: 'issuer',
		blurb:
			'Create, sign, and deliver verifiable credentials to holder wallets using a profile-specific exchange protocol.'
	}),
	Workflow({
		slug: 'credential-acceptance',
		name: 'Credential Acceptance',
		role: 'wallet',
		blurb:
			'Receive credentials from issuers, verify their authenticity, and store them for later presentation.'
	}),
	Workflow({
		slug: 'credential-request-and-verification',
		name: 'Credential Request and Verification',
		role: 'verifier',
		blurb:
			'Send a presentation request to a holder, receive a verifiable presentation, and validate the credentials it contains.'
	}),
	Workflow({
		slug: 'credential-presentation',
		name: 'Credential Presentation',
		role: 'wallet',
		blurb:
			'Respond to a verifier’s request by packaging selected credentials into a verifiable presentation.'
	}),
	Workflow({
		slug: 'direct-credential-issuance',
		name: 'Direct Credential Issuance',
		role: 'issuer',
		blurb:
			'Deliver credentials as a downloadable JSON file or copy-paste text, without an exchange protocol.'
	}),
	Workflow({
		slug: 'direct-credential-verification',
		name: 'Direct Credential Verification',
		role: 'verifier',
		blurb:
			'Validate a credential received as a JSON file or copy-paste text, including signature, status, and issuer trust.'
	})
];
