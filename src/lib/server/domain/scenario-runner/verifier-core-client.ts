import { verifyCredential } from '@digitalcredentials/verifier-core';

/**
 * The verifier-core wrapper the scenario runner verifies delivered credentials
 * with.
 *
 * It lived in `issuer-runner/` until M13 deleted that engine. Nothing about it
 * was issuer-specific — the scenario runner was already its only caller — so it
 * moved here rather than being deleted with its former neighbours.
 */

/**
 * Minimal verifier-core result shape we depend on. Was
 * `VerifierCoreResultLite` in the deleted engine's `checks/types.ts`; inlined
 * here, since this is now the only thing that names it.
 */
export type VerifierCoreResultLite = {
	verified: boolean;
	log?: Array<{ id: string; valid: boolean; error?: { name?: string } }>;
};

/**
 * Minimal input passed to the verifier-core client. Keeps the surface small so
 * a fake stays trivial.
 */
export type VerifyCredentialInput = { credential: unknown };

/**
 * Subset of verifier-core's `VerificationResponse` we actually consume.
 * Wider than `VerifierCoreResultLite` so server code can render the
 * raw verifier output if a future runner panel wants to.
 */
export type VerifyCredentialResult = VerifierCoreResultLite & {
	errors?: unknown[];
};

/** Both the real client and the in-memory fake satisfy this interface. */
export interface VerifierCoreClient {
	verifyCredential(input: VerifyCredentialInput): Promise<VerifyCredentialResult>;
}

/**
 * Wraps the published `@digitalcredentials/verifier-core` package.
 * Translates the package's response into our `VerifyCredentialResult`
 * shape and tolerates the package's looser typing.
 */
export function RealVerifierCoreClient(): VerifierCoreClient {
	return {
		async verifyCredential({ credential }) {
			const result = await verifyCredential({
				// verifier-core's `Credential` is structurally compatible with
				// our `unknown`-typed pasted credential; the package validates
				// the shape internally.
				credential: credential as Parameters<typeof verifyCredential>[0]['credential'],
				knownDIDRegistries: {}
			});
			const verified =
				Array.isArray(result.log) && result.log.length > 0
					? result.log.every((s) => s.valid !== false)
					: false;
			return {
				verified,
				log: result.log?.map((s) => ({
					id: s.id,
					valid: s.valid ?? false,
					error: s.error ? { name: s.error.name } : undefined
				})),
				errors: result.errors
			};
		}
	};
}
