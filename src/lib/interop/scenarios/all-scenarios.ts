import { assertValidCatalog } from './catalog-validation.js';
import { oid4WalletAcceptance } from './oid4-wallet-acceptance.js';
import { oid4WalletRefusalDiscrimination } from './oid4-wallet-refusal-discrimination.js';
import type { Scenario } from './scenario-schema.js';

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
export const allScenarios: Scenario[] = [oid4WalletAcceptance, oid4WalletRefusalDiscrimination];

// Fail loudly at import rather than rendering a meter whose denominator is
// quietly wrong. An invalid catalog is an authoring bug, caught at build time.
assertValidCatalog(allScenarios);
