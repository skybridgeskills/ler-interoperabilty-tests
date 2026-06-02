import type { VerifierCoreClient, VerifyCredentialResult } from './verifier-core-client.js';

/**
 * In-memory fake for tests + dev contexts that don't want to make
 * outbound network calls (DID resolution, status list fetch).
 *
 * Defaults to "verified, all log entries valid". Pass `presets` to
 * simulate failures.
 */
export function FakeVerifierCoreClient(
	presets: Partial<VerifyCredentialResult> = {}
): VerifierCoreClient {
	return {
		async verifyCredential() {
			return {
				verified: presets.verified ?? true,
				log: presets.log ?? [
					{ id: 'valid_signature', valid: true },
					{ id: 'revocation_status', valid: true },
					{ id: 'expiration', valid: true },
					{ id: 'issuer_did_resolves', valid: true }
				],
				errors: presets.errors
			};
		}
	};
}
