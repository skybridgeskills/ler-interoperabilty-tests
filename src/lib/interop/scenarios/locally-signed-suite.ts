import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * A cryptosuite the **suite itself** signs with, using its own locally-generated
 * key material.
 *
 * These are the two the `data-integrity-cryptosuites` bundle covers, and they are
 * the two `wallet-crypto` implements — `eddsa-rdfc-2022` (Ed25519) and
 * `ecdsa-rdfc-2019` (P-256).
 *
 * **A locally-signed suite is always servable.** The key is generated on demand;
 * nothing about the deployment's configuration can make it unavailable. That is
 * what separates it from an {@link IssuingIntent}, which names a cryptosuite the
 * **transaction service** must mint under and which a single-tenant deployment
 * may genuinely be unable to serve:
 *
 * > Only `issue` is tenant-bound. It is the one action the transaction service
 * > mints. Every other cryptosuite choice in the catalog is signed locally and is
 * > therefore always servable.
 *
 * So a step carrying one of these can never render blocked, and
 * `resolveIssuingContext` is not consulted for it. Three actions use it:
 * `deliver-direct` and `present-to-verifier` sign the credential they hand over,
 * and `receive-from-issuer` signs the holder key proof it authenticates with.
 *
 * Declared here rather than in `server/domain/wallet-crypto/` because
 * `interop/scenarios/` is client-safe and may not import server code. The server's
 * `WalletCryptosuite` is the same set, and `wallet-crypto`'s own tests pin the
 * agreement.
 */
export const LocallySignedSuite = ZodFactory(z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']));
export type LocallySignedSuite = ReturnType<typeof LocallySignedSuite>;
