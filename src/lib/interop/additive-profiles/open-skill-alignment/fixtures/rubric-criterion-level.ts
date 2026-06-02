/**
 * Sample OpenBadgeCredential with an Open-Skill-Alignment
 * `RubricCriterionLevel` resultDescription + result. Same shape
 * conventions as [[raw-score.ts]]; see that file for
 * fixture-lifecycle notes.
 */
export const rubricCriterionLevelFixture = {
	'@context': [
		'https://www.w3.org/ns/credentials/v2',
		'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
	],
	id: 'urn:uuid:1f0b7f8c-0a23-4a4f-9b8a-1c1c0a0a0003',
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	name: 'Technical Writing Portfolio Review',
	description: 'Demonstrated technical writing skill at the Proficient rubric level.',
	issuer: {
		id: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
		type: ['Profile'],
		name: 'Skybridge Skills LITS — Sample Issuer'
	},
	validFrom: '2026-05-01T00:00:00Z',
	credentialSubject: {
		id: 'mailto:writer@example.edu',
		type: ['AchievementSubject'],
		achievement: {
			id: 'urn:uuid:lits-sample-tech-writing-rubric',
			type: ['Achievement'],
			name: 'Technical Writing Portfolio Review',
			description:
				'Recognizes performance on the technical writing portfolio review against a three-level rubric.',
			criteria: {
				narrative: 'Earn at least the Proficient level on the technical-writing rubric.'
			},
			resultDescription: [
				{
					id: 'urn:uuid:lits-rd-tech-writing-rubric',
					type: ['ResultDescription'],
					name: 'Technical Writing Rubric',
					resultType: 'RubricCriterionLevel',
					requiredLevel: 'urn:uuid:lits-rcl-tech-writing-proficient',
					alignment: [
						{
							type: ['Alignment'],
							targetType: 'CFItem',
							targetName: 'Audience-aware technical communication',
							targetFramework: 'CTDL — Workforce Communication Skills',
							targetUrl:
								'https://credentialengineregistry.org/resources/ce-8b2c0afa-tech-writing-audience'
						}
					],
					rubricCriterionLevel: [
						{
							id: 'urn:uuid:lits-rcl-tech-writing-basic',
							type: ['RubricCriterionLevel'],
							name: 'Basic',
							level: 'Basic',
							description: 'Writing meets minimum requirements with notable gaps.'
						},
						{
							id: 'urn:uuid:lits-rcl-tech-writing-proficient',
							type: ['RubricCriterionLevel'],
							name: 'Proficient',
							level: 'Proficient',
							description: 'Writing is clear, accurate, and audience-aware.'
						},
						{
							id: 'urn:uuid:lits-rcl-tech-writing-mastery',
							type: ['RubricCriterionLevel'],
							name: 'Mastery',
							level: 'Mastery',
							description: 'Writing exemplifies professional-grade technical communication.'
						}
					]
				}
			]
		},
		result: [
			{
				type: ['Result'],
				resultDescription: 'urn:uuid:lits-rd-tech-writing-rubric',
				achievedLevel: 'urn:uuid:lits-rcl-tech-writing-proficient'
			}
		]
	},
	credentialStatus: {
		id: 'https://lits.example.org/status/0#44',
		type: 'BitstringStatusListEntry',
		statusPurpose: 'revocation',
		statusListIndex: '44',
		statusListCredential: 'https://lits.example.org/status/0'
	},
	proof: {
		type: 'DataIntegrityProof',
		cryptosuite: 'eddsa-rdfc-2022',
		created: '2026-05-01T00:00:00Z',
		verificationMethod:
			'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH#z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
		proofPurpose: 'assertionMethod',
		proofValue: 'z3PLACEHOLDER_PROOFVALUE_RUBRIC_FIXTURE_REGENERATE_WITH_REAL_SIGNATURE_IN_PHASE_04'
	}
};
