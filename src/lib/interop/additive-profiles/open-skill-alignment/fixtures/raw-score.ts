/**
 * Sample OpenBadgeCredential with an Open-Skill-Alignment RawScore
 * resultDescription + result. Used by:
 *
 * - `payload-fragment-schema.test.ts` (extracts the fragment).
 * - The issuer-runner check-runner tests in phase 03 (structural checks).
 * - The runner page "Load sample" picker (phase 05).
 *
 * The proof block is a placeholder shape; phase 04 may regenerate
 * fixtures with real eddsa-rdfc-2022 signatures from a suite-owned
 * did:key. Check-runner tests run against the JSON directly and do
 * not depend on signature validity.
 *
 * Alignment URLs point at real Credential Engine registry resource
 * paths (host: `credentialengineregistry.org`) to exercise the host
 * allowlist's `pass` branch.
 */
export const rawScoreFixture = {
	'@context': [
		'https://www.w3.org/ns/credentials/v2',
		'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
	],
	id: 'urn:uuid:1f0b7f8c-0a23-4a4f-9b8a-1c1c0a0a0001',
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	name: 'Algebra II Final Exam',
	description: 'Demonstrated proficiency on the Algebra II end-of-course exam.',
	issuer: {
		id: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
		type: ['Profile'],
		name: 'Skybridge Skills LITS — Sample Issuer'
	},
	validFrom: '2026-04-01T00:00:00Z',
	credentialSubject: {
		id: 'mailto:learner@example.edu',
		type: ['AchievementSubject'],
		achievement: {
			id: 'urn:uuid:lits-sample-algebra-ii-raw-score',
			type: ['Achievement'],
			name: 'Algebra II Final Exam',
			description:
				'Recognizes proficiency on the Algebra II end-of-course exam (raw score out of 100).',
			criteria: {
				narrative: 'Score 70 or higher on the Algebra II end-of-course exam.'
			},
			resultDescription: [
				{
					id: 'urn:uuid:lits-rd-algebra-ii-raw-score',
					type: ['ResultDescription'],
					name: 'Algebra II Final Exam Raw Score',
					resultType: 'RawScore',
					valueMin: '0',
					valueMax: '100',
					requiredValue: '70',
					alignment: [
						{
							type: ['Alignment'],
							targetType: 'CFItem',
							targetName: 'Solve quadratic equations',
							targetFramework: 'CTDL — Common Core Math',
							targetUrl:
								'https://credentialengineregistry.org/resources/ce-1f6a4a02-algebra-ii-quadratics'
						}
					]
				}
			]
		},
		result: [
			{
				type: ['Result'],
				resultDescription: 'urn:uuid:lits-rd-algebra-ii-raw-score',
				value: '87'
			}
		]
	},
	credentialStatus: {
		id: 'https://lits.example.org/status/0#42',
		type: 'BitstringStatusListEntry',
		statusPurpose: 'revocation',
		statusListIndex: '42',
		statusListCredential: 'https://lits.example.org/status/0'
	},
	proof: {
		type: 'DataIntegrityProof',
		cryptosuite: 'eddsa-rdfc-2022',
		created: '2026-04-01T00:00:00Z',
		verificationMethod:
			'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH#z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
		proofPurpose: 'assertionMethod',
		proofValue:
			'z3PLACEHOLDER_PROOFVALUE_RAWSCORE_FIXTURE_REGENERATE_WITH_REAL_SIGNATURE_IN_PHASE_04'
	}
};
