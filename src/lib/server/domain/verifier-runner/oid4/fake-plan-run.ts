import {
	PassKind,
	type VerifierRunPlan,
	type VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Deterministic oid4 run plan for tests + stories: one entry per
 * {@link PassKind} in enum order, with stable ids/labels and no crypto or
 * shuffle. Real ordering is secure-shuffled — see `generateOid4Plan`.
 */
export function fakePlanOid4Run(args: { cryptosuite: WalletCryptosuite }): VerifierRunPlan {
	const entries: VerifierRunPlanEntry[] = PassKind.schema.options.map((kind, index) => ({
		passId: `fake-pass-${index + 1}`,
		label: `Credential ${index + 1}`,
		kind
	}));
	return {
		runId: 'fake-oid4-run',
		profile: 'oid4',
		workflow: 'credential-request-and-verification',
		cryptosuite: args.cryptosuite,
		entries
	};
}
