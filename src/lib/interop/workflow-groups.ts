import { workflowBySlug } from './accessors.js';
import type { WorkflowSlug } from './profile-schema.js';
import type { Workflow } from './workflows.js';

export type WorkflowGroup = {
	slug: 'issue-to-wallet' | 'verify-from-wallet' | 'standalone';
	name: string;
	blurb: string;
	workflowSlugs: WorkflowSlug[];
};

/** The three conceptual pairs that organize the six workflows. */
export const allWorkflowGroups: WorkflowGroup[] = [
	{
		slug: 'issue-to-wallet',
		name: 'Issue to Wallet',
		blurb: 'Protocol-based credential delivery from issuers to holder wallets.',
		workflowSlugs: ['credential-issuance', 'credential-acceptance']
	},
	{
		slug: 'verify-from-wallet',
		name: 'Verify from Wallet',
		blurb: 'Holders present credentials to verifiers in response to a credential request.',
		workflowSlugs: ['credential-request-and-verification', 'credential-presentation']
	},
	{
		slug: 'standalone',
		name: 'Standalone Operations',
		blurb: 'Direct credential download or copy-paste workflows without a wallet.',
		workflowSlugs: ['direct-credential-issuance', 'direct-credential-verification']
	}
];

/** The workflows belonging to a group, in canonical order. */
export function workflowsInGroup(group: WorkflowGroup): Workflow[] {
	return group.workflowSlugs.map((slug) => workflowBySlug(slug)!);
}
