import type { WalletReport } from '$lib/server/domain/wallet-runner/index.js';

import type { WalletClient, WalletPresentResult, WalletRunResult } from './wallet-client.js';

/**
 * In-memory fake wallet client for tests/stories that don't exercise real crypto. Returns
 * deterministic completed-and-verified runs by default; pass an `accept` override to shape the
 * acceptance result (e.g. a failing conformance report) for a specific scenario.
 */
export function FakeWalletClient(override?: Partial<WalletRunResult>): WalletClient {
	const emptyReport: WalletReport = { verified: true, groups: [] };

	async function acceptCredential(): Promise<WalletRunResult> {
		return {
			exchange: { state: 'complete' },
			verify: { verified: true },
			report: emptyReport,
			...override
		};
	}

	async function presentCredential(): Promise<WalletPresentResult> {
		return {
			matched: true,
			vpToken: { type: ['VerifiablePresentation'] },
			verify: { verified: true },
			submitted: true,
			report: emptyReport
		};
	}

	return { acceptCredential, presentCredential };
}
export type FakeWalletClient = ReturnType<typeof FakeWalletClient>;
