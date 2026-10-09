import { describe, expect, it } from 'vitest';

import { allCheckIds, checkById } from './automatic-checks.js';
import type { RunEvidence, WireTrace } from './evidence.js';

/**
 * The trace is **display only**. This is the guard that keeps it that way.
 *
 * Every `automatic` check reads the transport summaries, which the receive and
 * present leaves compute server-side from the *full* response before the trace
 * projection truncates anything. That separation is the whole reason it is safe
 * to cap a stage body for display: cutting a body changes what the operator sees
 * and nothing that is scored.
 *
 * Rather than assert the rule statically, this runs every registered check over
 * the same evidence twice — once bare, once with a loud trace attached — and
 * requires an identical verdict and an identical message. A check that started
 * reading the trace would fail here, whatever it read.
 */
const NOISY_TRACE: WireTrace = {
	stages: [
		{
			name: 'credential',
			label: 'Credential request',
			method: 'POST',
			url: 'https://issuer.test/credential',
			status: 500,
			ok: false,
			body: {
				// Deliberately shaped like things checks care about, so a check that
				// wandered into the trace would find something and change its answer.
				type: ['VerifiableCredential', 'OpenBadgeCredential'],
				credentialSubject: { identifier: [{ type: 'IdentityObject' }] },
				proof: { type: 'DataIntegrityProof', cryptosuite: 'eddsa-rdfc-2022' },
				metadataReachable: true,
				verified: true
			},
			error: 'The credential request responded 500.'
		}
	]
};

/** A few shapes of evidence, so the comparison is not made against one empty case. */
function evidenceCases(): RunEvidence[] {
	const credential = {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: { id: 'did:web:issuer.example' },
		credentialSubject: {
			id: 'did:key:zHolder',
			identifier: [
				{
					type: 'IdentityObject',
					identityType: 'emailAddress',
					hashed: false,
					identityHash: 'learner@example.edu'
				}
			]
		}
	};
	return [
		{ steps: { s1: { stepId: 's1' } } },
		{
			steps: {
				s1: {
					stepId: 's1',
					artifact: credential,
					issuerFlow: { transport: 'direct', verified: true }
				}
			}
		},
		{
			steps: {
				s1: {
					stepId: 's1',
					artifact: credential,
					issuerFlow: {
						transport: 'oid4vci',
						verified: true,
						metadataReachable: true,
						diVpOffered: true,
						proofTypesOffered: ['di_vp'],
						diVpSigningAlgs: ['eddsa-rdfc-2022'],
						diVpSigningAlgInBundle: true,
						preAuthCodeRedeemed: true,
						credentialDelivered: true,
						issuerTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
					}
				}
			}
		}
	];
}

describe('no automatic check reads the wire trace', () => {
	it('resolves every registered check identically with and without a trace', () => {
		const ids = allCheckIds();
		expect(ids.length).toBeGreaterThan(0);

		for (const evidence of evidenceCases()) {
			const withTrace: RunEvidence = {
				steps: { s1: { ...evidence.steps.s1, trace: NOISY_TRACE } }
			};
			for (const id of ids) {
				const check = checkById(id)!;
				expect(check.run({ stepId: 's1', evidence: withTrace }), id).toEqual(
					check.run({ stepId: 's1', evidence })
				);
			}
		}
	});
});
