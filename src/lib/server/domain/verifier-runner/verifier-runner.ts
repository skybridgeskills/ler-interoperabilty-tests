import type {
	PassAttestation,
	VerifierRunDefinition,
	VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { scoreVerifierRun } from './score-run.js';

/** The injectable seam between Real and Fake runners: run generation. */
export type GenerateRunFn = (args: {
	cryptosuite: WalletCryptosuite;
}) => Promise<VerifierRunDefinition>;

/**
 * The verifier-runner service wired to the direct-delivery API routes:
 * generates acceptance runs (crypto-backed or faked via `generate`) and
 * scores attested runs. Scoring is pure and shared by Real and Fake
 * wirings, so route tests exercise the real scoring engine.
 */
export function VerifierRunner({ generate }: { generate: GenerateRunFn }) {
	return {
		/** Generate a fresh direct-delivery verifier run. */
		generateRun(args: { cryptosuite: WalletCryptosuite }): Promise<VerifierRunDefinition> {
			return generate(args);
		},

		/** Score an attested run (throws `VerifierRunMismatchError` on incoherence). */
		scoreRun(args: {
			run: VerifierRunDefinition;
			attestations: PassAttestation[];
		}): VerifierRunnerReport {
			return scoreVerifierRun(args);
		}
	};
}
export type VerifierRunner = ReturnType<typeof VerifierRunner>;
