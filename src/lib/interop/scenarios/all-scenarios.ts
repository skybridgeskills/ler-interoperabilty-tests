import { assertValidCatalog } from './catalog-validation.js';
import {
	oid4IssuerConsumerEcdsa,
	oid4IssuerConsumerEddsa,
	vcalmIssuerConsumerEcdsa,
	vcalmIssuerConsumerEddsa
} from './issuer-dic-consumer.js';
import {
	ob3DirectIssuerEcdsa,
	ob3DirectIssuerEddsa,
	oid4IssuerEcdsa,
	oid4IssuerEddsa,
	vcalmIssuerEcdsa,
	vcalmIssuerEddsa
} from './issuer-dic-producer.js';
import { ob3DirectIssuerDelivery } from './ob3-direct-issuer-delivery.js';
import { ob3DirectIssuerSkillsData } from './ob3-direct-issuer-skills-data.js';
import { ob3DirectVerifierAcceptance } from './ob3-direct-verifier-acceptance.js';
import { oid4IssuerIssuance } from './oid4-issuer-issuance.js';
import { oid4IssuerSkillsData } from './oid4-issuer-skills-data.js';
import { oid4VerifierAcceptance } from './oid4-verifier-acceptance.js';
import { oid4VerifierDelivery } from './oid4-verifier-delivery.js';
import { oid4WalletAcceptance } from './oid4-wallet-acceptance.js';
import { oid4WalletFaithfulRendering } from './oid4-wallet-faithful-rendering.js';
import { oid4WalletPresentation } from './oid4-wallet-presentation.js';
import { oid4WalletRefusalDiscrimination } from './oid4-wallet-refusal-discrimination.js';
import type { Scenario } from './scenario-schema.js';
import { vcalmIssuerIssuance } from './vcalm-issuer-issuance.js';
import { vcalmIssuerSkillsData } from './vcalm-issuer-skills-data.js';
import { vcalmVerifierAcceptance } from './vcalm-verifier-acceptance.js';
import { vcalmVerifierDelivery } from './vcalm-verifier-delivery.js';
import { vcalmWalletAcceptance } from './vcalm-wallet-acceptance.js';
import { vcalmWalletPresentation } from './vcalm-wallet-presentation.js';
import { vcalmWalletRefusalDiscrimination } from './vcalm-wallet-refusal-discrimination.js';
import {
	ob3DirectVerifierEcdsa,
	ob3DirectVerifierEddsa,
	oid4VerifierEcdsa,
	oid4VerifierEddsa,
	vcalmVerifierEcdsa,
	vcalmVerifierEddsa
} from './verifier-dic-discrimination.js';
import {
	oid4WalletDiscovery,
	oid4WalletPresentationLimited,
	oid4WalletPresentationPex,
	oid4WalletTamperRefusal
} from './wallet-conduct.js';
import {
	oid4WalletAcceptEcdsa,
	oid4WalletAcceptEddsa,
	vcalmWalletAcceptEcdsa,
	vcalmWalletAcceptEddsa
} from './wallet-dic-accept.js';
import {
	oid4WalletPresentEcdsa,
	oid4WalletPresentEddsa,
	vcalmWalletPresentEcdsa,
	vcalmWalletPresentEddsa
} from './wallet-dic-present.js';

/**
 * The scenario catalog — every runnable scenario in the suite, in display
 * order.
 *
 * The two proof-of-concept scenarios prove the architecture on
 * `credential-acceptance × oid4`. Add one file per scenario alongside this one
 * and register it here; nothing else needs to change, because the catalog is
 * data and the runner reaches into id-keyed registries for recipes, requests
 * and checks.
 *
 * A newly registered scenario should join its profiles as `optional` and be
 * promoted to `required` only at a deliberate catalog moment. That is a
 * convention, not something the validator can enforce — no rule can tell a
 * routine addition from a deliberate raising of the bar.
 */
export const allScenarios: Scenario[] = [
	oid4WalletAcceptance,
	oid4WalletRefusalDiscrimination,
	oid4WalletFaithfulRendering,
	vcalmWalletAcceptance,
	vcalmWalletRefusalDiscrimination,
	oid4WalletPresentation,
	vcalmWalletPresentation,
	ob3DirectVerifierAcceptance,
	vcalmVerifierDelivery,
	vcalmVerifierAcceptance,
	oid4VerifierDelivery,
	oid4VerifierAcceptance,
	ob3DirectIssuerDelivery,
	vcalmIssuerIssuance,
	oid4IssuerIssuance,
	ob3DirectIssuerSkillsData,
	vcalmIssuerSkillsData,
	oid4IssuerSkillsData,
	ob3DirectIssuerEddsa,
	vcalmIssuerEddsa,
	oid4IssuerEddsa,
	ob3DirectIssuerEcdsa,
	vcalmIssuerEcdsa,
	oid4IssuerEcdsa,
	oid4WalletPresentEddsa,
	vcalmWalletPresentEddsa,
	oid4WalletPresentEcdsa,
	vcalmWalletPresentEcdsa,
	oid4WalletAcceptEddsa,
	vcalmWalletAcceptEddsa,
	oid4WalletAcceptEcdsa,
	vcalmWalletAcceptEcdsa,
	vcalmIssuerConsumerEddsa,
	oid4IssuerConsumerEddsa,
	vcalmIssuerConsumerEcdsa,
	oid4IssuerConsumerEcdsa,
	ob3DirectVerifierEddsa,
	vcalmVerifierEddsa,
	oid4VerifierEddsa,
	ob3DirectVerifierEcdsa,
	vcalmVerifierEcdsa,
	oid4VerifierEcdsa,
	oid4WalletPresentationPex,
	oid4WalletPresentationLimited,
	oid4WalletDiscovery,
	oid4WalletTamperRefusal
];

// Fail loudly at import rather than rendering a meter whose denominator is
// quietly wrong. An invalid catalog is an authoring bug, caught at build time.
assertValidCatalog(allScenarios);
