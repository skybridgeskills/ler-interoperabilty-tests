import { WorkflowChecklist } from '../../profile-schema.js';

import { openSkillAlignmentPayloadSteps } from './payload-checklist-steps.js';

/**
 * Issuer × Direct Credential Issuance × Open Skill Alignment.
 *
 * Layered on top of the base OB 3.0 Direct Delivery issuer checklist;
 * adds structural requirements for `credentialSubject.result[]` +
 * `credentialSubject.achievement.resultDescription[]` plus CTDL
 * alignment URLs.
 *
 * Each requirement carries a stable `id` keyed off
 * `open-skill-alignment.<topic>.<assertion>`. Phase 03 maps these ids
 * to check functions in the issuer-runner check registry.
 */
export const issuerDirectCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	profile: 'ob3-direct-delivery',
	steps: openSkillAlignmentPayloadSteps
});
