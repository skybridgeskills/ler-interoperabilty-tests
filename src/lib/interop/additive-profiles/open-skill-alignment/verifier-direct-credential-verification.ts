import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Verifier × Direct Credential Verification × Open Skill Alignment.
 *
 * Content-only checklist (no verifier-side runner ships in this plan).
 * All three steps are SHOULDs in v1 — display affordances rather than
 * gating verification on skill-alignment data.
 */
export const verifierDirectCredentialVerification = WorkflowChecklist({
	role: 'verifier',
	workflow: 'direct-credential-verification',
	profile: 'ob3-direct-delivery',
	steps: [
		{
			title: 'Surface declared skill alignments to the end-user',
			summary:
				"Parse `credentialSubject.achievement.resultDescription[]` and surface each declared performance scale plus its CTDL alignment URLs to the verifier's end-user.",
			requirements: [
				{
					id: 'open-skill-alignment.verifier.surface-result-descriptions',
					level: 'SHOULD',
					text: "SHOULD parse and surface achievement-level alignments and the declared `resultDescription[]` to the verifier's end-user."
				}
			]
		},
		{
			title: 'Render each learner result against its declared scale',
			summary:
				'For every `credentialSubject.result[]` entry, render the recorded `value` or `achievedLevel` against the matching `resultDescription` so the end-user sees what the learner achieved on the declared scale.',
			requirements: [
				{
					id: 'open-skill-alignment.verifier.render-results',
					level: 'SHOULD',
					text: 'SHOULD render each `result[]` entry against its matching `resultDescription`, showing the scale and the value-or-achievedLevel.'
				}
			]
		},
		{
			title: 'Degrade gracefully on unrecognized result types',
			summary:
				'When a `resultDescription.resultType` is outside the recognized set, render the raw `value` / `achievedLevel` and surface a notice to the end-user.',
			requirements: [
				{
					id: 'open-skill-alignment.verifier.unknown-result-type',
					level: 'SHOULD',
					text: 'SHOULD treat unknown `resultType` values gracefully — display the raw `value` / `achievedLevel` plus a notice that the verifier does not recognize the result type.'
				}
			]
		}
	]
});
