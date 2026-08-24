import { advertisedCryptosuitesRecorded } from './checks/advertised-cryptosuites-recorded.js';
import { credentialDiProofBundle } from './checks/credential-di-proof-bundle.js';
import { credentialDiProofEcdsa } from './checks/credential-di-proof-ecdsa.js';
import { credentialDiProofEddsa } from './checks/credential-di-proof-eddsa.js';
import { credentialIssuerDidMethod } from './checks/credential-issuer-did-method.js';
import { credentialIssuerDid } from './checks/credential-issuer-did.js';
import { credentialOb3Type } from './checks/credential-ob3-type.js';
import { credentialStatusList } from './checks/credential-status-list.js';
import { credentialSubjectIdentifierEmail } from './checks/credential-subject-identifier-email.js';
import { credentialValidUntil } from './checks/credential-valid-until.js';
import { credentialVcdm2 } from './checks/credential-vcdm2.js';
import { discoveryConstructionRfc8414 } from './checks/discovery-construction-rfc8414.js';
import { exchangeReachedComplete } from './checks/exchange-reached-complete.js';
import { holderDidBound } from './checks/holder-did-bound.js';
import { issuerAcceptedKeyProofEcdsa } from './checks/issuer-accepted-key-proof-ecdsa.js';
import { issuerAcceptedKeyProofEddsa } from './checks/issuer-accepted-key-proof-eddsa.js';
import { issuerAdvertisesKeyProofEcdsa } from './checks/issuer-advertises-key-proof-ecdsa.js';
import { issuerAdvertisesKeyProofEddsa } from './checks/issuer-advertises-key-proof-eddsa.js';
import { issuerBindsHolderDid } from './checks/issuer-binds-holder-did.js';
import { issuerKeyProofSuiteEcdsa } from './checks/issuer-key-proof-suite-ecdsa.js';
import { issuerKeyProofSuiteEddsa } from './checks/issuer-key-proof-suite-eddsa.js';
import { limitDisclosureRecorded } from './checks/limit-disclosure-recorded.js';
import { offerWasFetched } from './checks/offer-was-fetched.js';
import { oid4IssuerCredentialEndpoint } from './checks/oid4-issuer-credential-endpoint.js';
import { oid4IssuerDiVpAccepted } from './checks/oid4-issuer-di-vp-accepted.js';
import { oid4IssuerDiVpProofType } from './checks/oid4-issuer-di-vp-proof-type.js';
import { oid4IssuerDiVpSigningAlgs } from './checks/oid4-issuer-di-vp-signing-algs.js';
import { oid4IssuerMetadataEndpoint } from './checks/oid4-issuer-metadata-endpoint.js';
import { oid4IssuerNotJwtOnlyProof } from './checks/oid4-issuer-not-jwt-only-proof.js';
import { oid4IssuerPreAuthorizedCode } from './checks/oid4-issuer-pre-authorized-code.js';
import { oid4IssuerTls } from './checks/oid4-issuer-tls.js';
import { oid4RequestDiVpFormat } from './checks/oid4-request-di-vp-format.js';
import { oid4RequestEndpoint } from './checks/oid4-request-endpoint.js';
import { oid4RequestMatchable } from './checks/oid4-request-matchable.js';
import { oid4RequestTls } from './checks/oid4-request-tls.js';
import { oid4ResponseEndpoint } from './checks/oid4-response-endpoint.js';
import { oid4ResponseTls } from './checks/oid4-response-tls.js';
import { oid4vpQueryLanguageRecorded } from './checks/oid4vp-query-language-recorded.js';
import { osaAchievedLevelMatches } from './checks/osa-achieved-level-matches.js';
import { osaCtdlAlignment } from './checks/osa-ctdl-alignment.js';
import { osaNumericValueInRange } from './checks/osa-numeric-value-in-range.js';
import { osaPercentValueRange } from './checks/osa-percent-value-range.js';
import { osaRecognizedResultType } from './checks/osa-recognized-result-type.js';
import { osaResultDescriptionPresent } from './checks/osa-result-description-present.js';
import { osaResultLinksDescription } from './checks/osa-result-links-description.js';
import { osaResultPresent } from './checks/osa-result-present.js';
import { osaRubricLevelsPresent } from './checks/osa-rubric-levels-present.js';
import { tamperRecorded } from './checks/tamper-recorded.js';
import { vcalmInteractionEndpoint } from './checks/vcalm-interaction-endpoint.js';
import { vcalmIssuerDidauthRequested } from './checks/vcalm-issuer-didauth-requested.js';
import { vcalmIssuerInteractionUrl } from './checks/vcalm-issuer-interaction-url.js';
import { vcalmIssuerParticipationEndpoint } from './checks/vcalm-issuer-participation-endpoint.js';
import { vcalmIssuerTls } from './checks/vcalm-issuer-tls.js';
import { vcalmIssuerVcapiInProtocols } from './checks/vcalm-issuer-vcapi-in-protocols.js';
import { vcalmRequestTls } from './checks/vcalm-request-tls.js';
import { vcalmResponseEndpoint } from './checks/vcalm-response-endpoint.js';
import { vcalmResponseTls } from './checks/vcalm-response-tls.js';
import { vcalmVprDidauth } from './checks/vcalm-vpr-didauth.js';
import { vcalmVprQuery } from './checks/vcalm-vpr-query.js';
import { walletHolderDidMethod } from './checks/wallet-holder-did-method.js';
import { walletHolderKeyTypeEcdsa } from './checks/wallet-holder-key-type-ecdsa.js';
import { walletHolderKeyTypeEddsa } from './checks/wallet-holder-key-type-eddsa.js';
import { walletVpCryptosuiteEcdsa } from './checks/wallet-vp-cryptosuite-ecdsa.js';
import { walletVpCryptosuiteEddsa } from './checks/wallet-vp-cryptosuite-eddsa.js';
import { walletVpDelivered } from './checks/wallet-vp-delivered.js';
import { walletVpDiNotJwt } from './checks/wallet-vp-di-not-jwt.js';
import { walletVpPreservesVcProofs } from './checks/wallet-vp-preserves-vc-proofs.js';
import { walletVpProofBinding } from './checks/wallet-vp-proof-binding.js';
import { walletVpSignatureValid } from './checks/wallet-vp-signature-valid.js';
import type { RunEvidence } from './evidence.js';

/** What a check decided, and why — the `detail` is shown beside the requirement. */
export type CheckResult = { met: boolean; detail?: string };

/**
 * A pure function over a run's evidence, resolved by `checkId` from this
 * registry.
 *
 * **This is the escape hatch, and it is deliberately a small one.** A check is a
 * function, not a page. When a scenario cannot be expressed, the fix is a new
 * `ScenarioAction` kind — reviewed once, reusable forever — never a bespoke page
 * that forks the result shape.
 *
 * A check receives the whole {@link RunEvidence}, not just its own step's, so it
 * *can* read prior steps. Nothing shipped does yet; round-trip will.
 *
 * **Do not write a check that claims to detect a wallet's private refusal.** The
 * wire cannot see one: delivery succeeds and the wallet refuses afterwards,
 * beyond our last observation point. Attesting that is the operator's job, and
 * the fact that only they can see it is the thing the quiz measures.
 */
export type AutomaticCheck = {
	id: string;
	/** One line, for authoring. */
	summary: string;
	run(args: { stepId: string; evidence: RunEvidence }): CheckResult;
};

/** Every automatic check a requirement may name, keyed by id. */
export const automaticChecks: Record<string, AutomaticCheck> = {
	[exchangeReachedComplete.id]: exchangeReachedComplete,
	[offerWasFetched.id]: offerWasFetched,
	[holderDidBound.id]: holderDidBound,
	// The VCALM verifier floor + delivery, ported from the verifier-runner engine
	// as pure functions over a `present-to-verifier` step's request/present evidence.
	[vcalmInteractionEndpoint.id]: vcalmInteractionEndpoint,
	[vcalmVprQuery.id]: vcalmVprQuery,
	[vcalmVprDidauth.id]: vcalmVprDidauth,
	[vcalmRequestTls.id]: vcalmRequestTls,
	[vcalmResponseTls.id]: vcalmResponseTls,
	[vcalmResponseEndpoint.id]: vcalmResponseEndpoint,
	// The OID4VP verifier floor + delivery, ported from the verifier-runner oid4
	// engine as pure functions over a `present-to-verifier` step's request/present
	// evidence. di-vp-format fails only on a JWT-only request; request-tls reads an
	// inline request as met (SHOULD); nonce-freshness is intentionally absent (a
	// future expanded-set candidate — see the M10b notes).
	[oid4RequestEndpoint.id]: oid4RequestEndpoint,
	[oid4RequestMatchable.id]: oid4RequestMatchable,
	[oid4RequestDiVpFormat.id]: oid4RequestDiVpFormat,
	[oid4RequestTls.id]: oid4RequestTls,
	[oid4ResponseTls.id]: oid4ResponseTls,
	[oid4ResponseEndpoint.id]: oid4ResponseEndpoint,
	// The credential-payload family a `receive-from-issuer` step produces, ported
	// from the two issuer engines. **Transport-independent by construction**: each
	// reads the received credential from `StepEvidence.artifact`, never from the
	// wire summary, which is why one family serves the paste page, VCALM and
	// OID4VCI alike and why 58 engine rows collapse to 33 checks. Every `warn` and
	// `n/a` branch the engines carried is resolved at authoring — see each check.
	[credentialVcdm2.id]: credentialVcdm2,
	[credentialOb3Type.id]: credentialOb3Type,
	[credentialSubjectIdentifierEmail.id]: credentialSubjectIdentifierEmail,
	[credentialDiProofEddsa.id]: credentialDiProofEddsa,
	[credentialDiProofEcdsa.id]: credentialDiProofEcdsa,
	[credentialDiProofBundle.id]: credentialDiProofBundle,
	[credentialStatusList.id]: credentialStatusList,
	[credentialIssuerDid.id]: credentialIssuerDid,
	[credentialIssuerDidMethod.id]: credentialIssuerDidMethod,
	[credentialValidUntil.id]: credentialValidUntil,
	// The VCALM issuer wire, ported from `wallet-runner/checks/vcalm-issuer-flow.ts`
	// as pure functions over the `receive-from-issuer` step's `issuerFlow` summary.
	// `interaction-url` and `participation-endpoint` read one driver probe between
	// them and both say so; `didauth-requested`'s `warn` branch resolves to a fail.
	[vcalmIssuerInteractionUrl.id]: vcalmIssuerInteractionUrl,
	[vcalmIssuerParticipationEndpoint.id]: vcalmIssuerParticipationEndpoint,
	[vcalmIssuerTls.id]: vcalmIssuerTls,
	[vcalmIssuerVcapiInProtocols.id]: vcalmIssuerVcapiInProtocols,
	[vcalmIssuerDidauthRequested.id]: vcalmIssuerDidauthRequested,
	// The OID4VCI issuer wire, ported from `wallet-runner/checks/oid4-issuer-flow.ts`.
	// `tls` covers the metadata, token and credential endpoints in one row (the
	// engine's `tls-credential` was the same probe under a second id);
	// `di-vp-signing-algs`'s `warn` branch resolves to a fail.
	[oid4IssuerMetadataEndpoint.id]: oid4IssuerMetadataEndpoint,
	[oid4IssuerDiVpProofType.id]: oid4IssuerDiVpProofType,
	[oid4IssuerDiVpSigningAlgs.id]: oid4IssuerDiVpSigningAlgs,
	[oid4IssuerNotJwtOnlyProof.id]: oid4IssuerNotJwtOnlyProof,
	[oid4IssuerTls.id]: oid4IssuerTls,
	[oid4IssuerPreAuthorizedCode.id]: oid4IssuerPreAuthorizedCode,
	[oid4IssuerCredentialEndpoint.id]: oid4IssuerCredentialEndpoint,
	[oid4IssuerDiVpAccepted.id]: oid4IssuerDiVpAccepted,
	// Shared by both live issuer transports — it reads two fields present on both
	// summary variants, so it is registered once and named by both scenarios.
	[issuerBindsHolderDid.id]: issuerBindsHolderDid,
	// The Open Skill Alignment payload, ported from
	// `issuer-runner/checks/open-skill-alignment-issuer.ts`. Transport-independent
	// like the `credential-*` family, which is what lets one set serve all three
	// `*-issuer-skills-data` scenarios in a single `oneOf` group. The engine's
	// `includeAdditive` guard is gone: a scenario either names the additive or does
	// not. A missing upstream `.present` resolves to a fail; a rule with nothing to
	// apply to resolves to a vacuous pass — see each check for which and why.
	[osaResultDescriptionPresent.id]: osaResultDescriptionPresent,
	[osaRecognizedResultType.id]: osaRecognizedResultType,
	[osaPercentValueRange.id]: osaPercentValueRange,
	[osaRubricLevelsPresent.id]: osaRubricLevelsPresent,
	[osaCtdlAlignment.id]: osaCtdlAlignment,
	[osaResultPresent.id]: osaResultPresent,
	[osaResultLinksDescription.id]: osaResultLinksDescription,
	[osaNumericValueInRange.id]: osaNumericValueInRange,
	[osaAchievedLevelMatches.id]: osaAchievedLevelMatches,
	// The wallet presentation family, ported from `wallet-runner`'s black-box
	// scorer. The cheapest of the four migrations, because here the suite is the
	// **verifier**: the transaction service folds verifier-core's result into
	// `variables.results.default` and the poll route already returns it, so these
	// read `StepEvidence.exchange` directly — no server leaf, no new evidence slot.
	// The engine's `n/a` branches resolve to fails (the step's job was to elicit a
	// presentation) and its `warn` on a challenge without a domain resolves to a
	// fail (a replayable binding is a failed requirement, not a caveat). The one
	// vacuous pass is `key-type` on a non-`did:key` holder.
	[walletVpDelivered.id]: walletVpDelivered,
	[walletVpDiNotJwt.id]: walletVpDiNotJwt,
	[walletVpSignatureValid.id]: walletVpSignatureValid,
	[walletVpProofBinding.id]: walletVpProofBinding,
	[walletVpPreservesVcProofs.id]: walletVpPreservesVcProofs,
	// The `data-integrity-cryptosuites` wallet **producer** axis, split by suite so
	// the meter can say which one a wallet actually proved. Observed, never pinned:
	// the suite plays verifier here and cannot choose a wallet's key.
	[walletVpCryptosuiteEddsa.id]: walletVpCryptosuiteEddsa,
	[walletVpCryptosuiteEcdsa.id]: walletVpCryptosuiteEcdsa,
	[walletHolderDidMethod.id]: walletHolderDidMethod,
	[walletHolderKeyTypeEddsa.id]: walletHolderKeyTypeEddsa,
	[walletHolderKeyTypeEcdsa.id]: walletHolderKeyTypeEcdsa,
	// The variation family: four presence checks proving a requested variation
	// took effect, and one measuring the wallet's own metadata-discovery
	// construction.
	//
	// The four read `exchange.variables` and nothing else. Upstream each variable
	// is `.optional()` with no `.default()` and this suite is the only party that
	// sets it, so **presence alone proves the request was honoured** — no
	// comparison against what was asked, and therefore no new evidence field and
	// no widening of the check signature. Every failure detail names the HARNESS:
	// a stripped variable is this deployment's shortfall, and a reader must not
	// take it for a defect in the wallet under test.
	[oid4vpQueryLanguageRecorded.id]: oid4vpQueryLanguageRecorded,
	[limitDisclosureRecorded.id]: limitDisclosureRecorded,
	[tamperRecorded.id]: tamperRecorded,
	[advertisedCryptosuitesRecorded.id]: advertisedCryptosuitesRecorded,
	// Wallet-borne and therefore observed, never pinned: the service serves both
	// well-known constructions, so the wallet's choice IS the measurement. Scores
	// the ordered election array rather than a value, and is a SHOULD — a wallet
	// with the bug completes here and fails against a stricter verifier later.
	[discoveryConstructionRfc8414.id]: discoveryConstructionRfc8414,

	// The `data-integrity-cryptosuites` ISSUER CONSUMER axis (M15 P4) — the one DIC
	// axis never measured under any model. Locally-signed key proofs, so always
	// servable; see `checks/issuer-key-proof.ts`.
	[issuerAcceptedKeyProofEddsa.id]: issuerAcceptedKeyProofEddsa,
	[issuerAcceptedKeyProofEcdsa.id]: issuerAcceptedKeyProofEcdsa,
	[issuerKeyProofSuiteEddsa.id]: issuerKeyProofSuiteEddsa,
	[issuerKeyProofSuiteEcdsa.id]: issuerKeyProofSuiteEcdsa,
	[issuerAdvertisesKeyProofEddsa.id]: issuerAdvertisesKeyProofEddsa,
	[issuerAdvertisesKeyProofEcdsa.id]: issuerAdvertisesKeyProofEcdsa
};

/**
 * Resolve a check id, or `undefined` when nothing is registered under it. The
 * catalog is authored data and can name a check that does not exist; callers
 * surface that as a failed requirement rather than crashing a live run.
 */
export function checkById(id: string): AutomaticCheck | undefined {
	return automaticChecks[id];
}

/** Every registered check id, for error messages and authoring tools. */
export function allCheckIds(): string[] {
	return Object.keys(automaticChecks);
}
