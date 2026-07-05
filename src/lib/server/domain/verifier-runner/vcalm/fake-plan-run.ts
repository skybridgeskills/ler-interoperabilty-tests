import {
	PassKind,
	type VerifierRunPlan,
	type VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Deterministic vcalm run plan for tests + stories: one entry per
 * {@link PassKind} in enum order, stable ids/labels, no crypto or shuffle. Real
 * ordering is secure-shuffled — see `generateVcalmPlan`.
 */
export function fakePlanVcalmRun(args: { cryptosuite: WalletCryptosuite }): VerifierRunPlan {
	const entries: VerifierRunPlanEntry[] = PassKind.schema.options.map((kind, index) => ({
		passId: `fake-pass-${index + 1}`,
		label: `Credential ${index + 1}`,
		kind
	}));
	return {
		runId: 'fake-vcalm-run',
		profile: 'vcalm',
		workflow: 'credential-request-and-verification',
		cryptosuite: args.cryptosuite,
		entries
	};
}
