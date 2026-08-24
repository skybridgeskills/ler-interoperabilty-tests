/**
 * The suite's own test wallet, server side: the holder-flow drivers and the HTTP
 * primitives they share.
 *
 * M13 removed the acceptance half. `WalletClient` / `RealWalletClient` existed to
 * run a holder flow **and score it** through `wallet-runner`'s `ExchangeChecker`;
 * with the scoring engines gone and the runnable pages migrated, nothing called
 * it. What survives is what the scenario runner actually uses — the issuer-flow
 * and verifier/presentation drivers reached directly by `issuer-receive/` and
 * `verifier-present/`, which project their observations into client-safe
 * summaries for the scenario checks to read.
 */

export {
	VcalmIssuerFlowDriver,
	type VcalmIssuerFlow,
	type IssuerFlowObservations,
	type IssuerFlowRunResult,
	type DidAuthObservation,
	type DeliveryObservation
} from './drivers/vcalm-issuer-flow.js';
export {
	makeHttpExchangeFlowTransport,
	probeTls,
	type ExchangeFlowTransport,
	type FetchInteractionResult,
	type PostToVcapiResult,
	type TlsProbeResult
} from './exchange-flow-transport.js';
export { FakeVcalmIssuerFlow } from './fake-vcalm-issuer-flow.js';
export {
	Oid4IssuerFlowDriver,
	type Oid4IssuerFlow,
	type Oid4IssuerFlowObservations,
	type Oid4IssuerFlowRunResult,
	type Oid4StepObservation
} from './drivers/oid4-issuer-flow.js';
export { FakeOid4IssuerFlow } from './fake-oid4-issuer-flow.js';
export {
	PRE_AUTH_GRANT,
	preAuthorizedCodeOf,
	wellKnownMetadataUrl,
	parseOfferLink,
	fetchOffer,
	getJson,
	postForm,
	extractCredential,
	type CredentialOffer,
	type ParsedOfferLink
} from './oid4vci/index.js';
