import { WorkflowChecklist } from '../../profile-schema.js';

import { openSkillAlignmentPayloadSteps } from './payload-checklist-steps.js';

/**
 * Issuer × Credential Issuance × Open Skill Alignment.
 *
 * Layers the workflow-agnostic OSA payload requirements onto the
 * protocol-based issuer issuance workflow (VCALM + OID4). The
 * `profile` field is representative only — `additiveChecklistsForCombination`
 * matches on (role, workflow) and ignores the checklist's own profile,
 * so this single checklist applies to both VCALM and OID4 base profiles.
 *
 * Reuses `openSkillAlignmentPayloadSteps` verbatim so the requirement
 * `id`s stay identical to the direct-delivery checklist and the
 * issuer-runner check registry keeps matching.
 */
export const issuerCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'vcalm',
	steps: openSkillAlignmentPayloadSteps
});
