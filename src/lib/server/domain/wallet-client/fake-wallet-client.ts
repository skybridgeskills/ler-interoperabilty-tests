import type { WalletReport } from '$lib/server/domain/wallet-runner/index.js';

import type { WalletClient, WalletRunResult } from './wallet-client.js';

/**
 * In-memory fake wallet client for tests/stories that don't exercise real crypto. Returns a
 * deterministic completed-and-verified run by default; pass `override` to shape the result
 * (e.g. a failing conformance report) for a specific scenario.
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

	return { acceptCredential };
}
export type FakeWalletClient = ReturnType<typeof FakeWalletClient>;
