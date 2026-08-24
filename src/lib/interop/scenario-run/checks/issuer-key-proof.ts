import type { CheckResult } from '../automatic-checks.js';
import type { RunEvidence } from '../evidence.js';
import { evidenceForStep, issuerFlowForStep } from '../evidence.js';

/**
 * The shared assertions behind the `data-integrity-cryptosuites` **issuer
 * consumer** scenarios, parameterised by the cryptosuite the calling scenario
 * signed its holder key proof with.
 *
 * **This is the mirror of the wallet's consumer axis, and it pins nothing.** The
 * varied field is `receive-from-issuer.keyProofSuite` — the cryptosuite the
 * *suite's own* test wallet signs its DIDAuthentication VP (VCALM) or `di_vp`
 * key proof (OID4VCI) with. `wallet-crypto` generates it locally, so it is
 * always servable and these scenarios can never render blocked. The wallet's
 * accept axis varies an `IssuingIntent` instead, which the transaction service
 * must mint under and which a single-tenant deployment genuinely may not serve.
 *
 * Both are "consumer" axes and they read alike in the catalog; the difference is
 * who holds the key.
 *
 * Ported from nothing: `consumer.verify-vp-all` and `consumer.resolve-holder-dids`
 * had **no registered check** under the checklist model and none under scenarios,
 * so selecting DIC on the old live issuer pages scored neither. This is the first
 * time either is measured.
 */

/** Multibase prefix a `did:key` carries for each cryptosuite's key type. */
const DID_KEY_PREFIX: Record<string, string> = {
	'eddsa-rdfc-2022': 'did:key:z6Mk', // Ed25519
	'ecdsa-rdfc-2019': 'did:key:zDna' // P-256
};

/** Human name for the key type behind a cryptosuite, for the operator-facing detail. */
const KEY_NAME: Record<string, string> = {
	'eddsa-rdfc-2022': 'Ed25519',
	'ecdsa-rdfc-2019': 'P-256'
};

/**
 * Your issuer accepted a holder key proof signed with `cryptosuite`.
 *
 * **The consumer measurement.** The suite authenticated with a key of the suite
 * under test; if the issuer went on to deliver a credential, it verified that key
 * proof — an issuer that cannot verify the suite refuses at the DIDAuth or `di_vp`
 * step and nothing arrives.
 *
 * A `direct` intake is a **fail with an explaining detail** rather than a vacuous
 * pass: a paste has no key proof at all, so a direct scenario cannot ask this
 * question, and one that does is an authoring bug worth surfacing rather than
 * quietly passing.
 */
export function acceptedKeyProofResult(
	evidence: RunEvidence,
	stepId: string,
	cryptosuite: string
): CheckResult {
	const flow = issuerFlowForStep(evidence, stepId);
	if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
	if (flow.transport === 'direct') {
		return {
			met: false,
			detail:
				'A pasted credential carries no holder key proof, so this scenario cannot measure whether your issuer verified one.'
		};
	}

	const delivered = evidenceForStep(evidence, stepId)?.transport?.delivered === true;
	const proofName =
		flow.transport === 'vcalm' ? 'DIDAuthentication presentation' : '`di_vp` key proof';

	return delivered
		? {
				met: true,
				detail: `Your issuer accepted our ${proofName} signed with \`${cryptosuite}\` and issued the credential.`
			}
		: {
				met: false,
				detail: `No credential arrived after we authenticated with a \`${cryptosuite}\` ${proofName}. An issuer that cannot verify this cryptosuite refuses at that step.`
			};
}

/**
 * We really did authenticate with the cryptosuite this scenario claims.
 *
 * **The verify-what-you-got guard, and it is not decoration.** Without it,
 * "your issuer verified our ECDSA key proof" would rest on nothing but our own
 * configuration — the exact failure the exchange-variation effort identified,
 * where a silently-dropped request variable turns a green run into a false
 * label. The suite's holder DID is a `did:key` whose multibase prefix encodes the
 * key type, which is the same fact `wallet-holder-key-type-*` reads off a
 * presentation.
 *
 * A missing holder DID **fails**: it means the flow never reached the
 * authentication step, so the row above is unsupported and this one should say
 * so rather than pass silently.
 */
export function keyProofSuiteResult(
	evidence: RunEvidence,
	stepId: string,
	cryptosuite: string
): CheckResult {
	const flow = issuerFlowForStep(evidence, stepId);
	if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
	if (flow.transport === 'direct') {
		return { met: false, detail: 'A pasted credential involves no holder key proof.' };
	}
	if (!flow.holderDid) {
		return {
			met: false,
			detail: 'The flow recorded no holder DID, so it never reached the key-proof step.'
		};
	}

	const expected = DID_KEY_PREFIX[cryptosuite];
	if (!flow.holderDid.startsWith('did:key:')) {
		return {
			met: false,
			detail: `We authenticated as \`${flow.holderDid}\`, which is not a \`did:key\` and encodes no key type to confirm.`
		};
	}
	return expected && flow.holderDid.startsWith(expected)
		? {
				met: true,
				detail: `We authenticated with a ${KEY_NAME[cryptosuite]} key, as \`${cryptosuite}\` requires.`
			}
		: {
				met: false,
				detail: `We authenticated as \`${flow.holderDid}\`, which does not encode a ${KEY_NAME[cryptosuite]} key — the run did not use the cryptosuite this scenario measures.`
			};
}

/**
 * Your issuer advertises this cryptosuite for `di_vp` key proofs. **OID4VCI
 * only**, and deliberately a SHOULD.
 *
 * Advertising is not accepting: an issuer that accepts the suite without listing
 * it in `proof_signing_alg_values_supported` has a documentation bug, not an
 * interop failure — a wallet choosing from the advertised list would simply never
 * offer it. VCALM advertises no equivalent, which is why the two members of a
 * suite pair declare different requirement ids; that is legal since M15 dropped
 * the `oneOf` groups, and would have broken catalog rule 5 before it.
 */
export function advertisesKeyProofSuiteResult(
	evidence: RunEvidence,
	stepId: string,
	cryptosuite: string
): CheckResult {
	const flow = issuerFlowForStep(evidence, stepId);
	if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
	if (flow.transport !== 'oid4vci') {
		return { met: false, detail: 'This step did not receive over OID4VCI.' };
	}
	if (flow.diVpSigningAlgs.length === 0) {
		return {
			met: false,
			detail: '`proof_signing_alg_values_supported` is absent for the `di_vp` proof type.'
		};
	}
	return flow.diVpSigningAlgs.includes(cryptosuite)
		? {
				met: true,
				detail: `Your issuer advertises \`${cryptosuite}\` for \`di_vp\` key proofs.`
			}
		: {
				met: false,
				detail: `Your issuer advertises ${flow.diVpSigningAlgs.map((a) => `\`${a}\``).join(', ')} for \`di_vp\` key proofs, not \`${cryptosuite}\`. A wallet choosing from that list would never offer this cryptosuite.`
			};
}
