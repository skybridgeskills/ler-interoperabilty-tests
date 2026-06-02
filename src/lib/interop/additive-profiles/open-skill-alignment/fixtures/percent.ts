/**
 * Sample OpenBadgeCredential with an Open-Skill-Alignment Percent
 * resultDescription + result. Same shape conventions as
 * [[raw-score.ts]]; see that file for fixture-lifecycle notes.
 */
export const percentFixture = {
	'@context': [
		'https://www.w3.org/ns/credentials/v2',
		'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
	],
	id: 'urn:uuid:1f0b7f8c-0a23-4a4f-9b8a-1c1c0a0a0002',
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	name: 'Welding Skills Practicum',
	description: 'Demonstrated welding safety + technique on the practicum assessment.',
	issuer: {
		id: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
		type: ['Profile'],
		name: 'Skybridge Skills LITS — Sample Issuer'
	},
	validFrom: '2026-04-15T00:00:00Z',
	credentialSubject: {
		id: 'mailto:welder@example.edu',
		type: ['AchievementSubject'],
		achievement: {
			id: 'urn:uuid:lits-sample-welding-practicum-percent',
			type: ['Achievement'],
			name: 'Welding Skills Practicum',
			description:
				'Recognizes proficiency on the welding practicum, scored as a percentage of total possible points.',
			criteria: {
				narrative: 'Score 80% or higher on the practicum rubric.'
			},
			resultDescription: [
				{
					id: 'urn:uuid:lits-rd-welding-percent',
					type: ['ResultDescription'],
					name: 'Welding Practicum Percent Score',
					resultType: 'Percent',
					valueMin: '0',
					valueMax: '100',
					requiredValue: '80',
					alignment: [
						{
							type: ['Alignment'],
							targetType: 'CFItem',
							targetName: 'Shielded metal arc welding (SMAW) — flat position',
							targetFramework: 'CTDL — Industry Welding Skills',
							targetUrl:
								'https://credentialengineregistry.org/resources/ce-9d1b00c1-welding-smaw-flat'
						}
					]
				}
			]
		},
		result: [
			{
				type: ['Result'],
				resultDescription: 'urn:uuid:lits-rd-welding-percent',
				value: '82'
			}
		]
	},
	credentialStatus: {
		id: 'https://lits.example.org/status/0#43',
		type: 'BitstringStatusListEntry',
		statusPurpose: 'revocation',
		statusListIndex: '43',
		statusListCredential: 'https://lits.example.org/status/0'
	},
	proof: {
		type: 'DataIntegrityProof',
		cryptosuite: 'eddsa-rdfc-2022',
		created: '2026-04-15T00:00:00Z',
		verificationMethod:
			'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH#z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
		proofPurpose: 'assertionMethod',
		proofValue:
			'z3PLACEHOLDER_PROOFVALUE_PERCENT_FIXTURE_REGENERATE_WITH_REAL_SIGNATURE_IN_PHASE_04'
	}
};
