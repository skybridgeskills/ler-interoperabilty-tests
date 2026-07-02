import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import type { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import { buildWalletClient } from './build-wallet-client.js';
import { FakeWalletClient } from './fake-wallet-client.js';
import type { WalletClient, WalletRunResult } from './wallet-client.js';

export type WalletClientCtx = {
	walletClient: WalletClient;
};

/** Dev / production wiring — real wallet client (WalletCrypto + HTTP drivers). */
export function provideRealWalletClient(config: ExchangeRunnerConfig) {
	return { walletClient: buildWalletClient(config) };
}

/** Test wiring — deterministic in-memory wallet client. */
export function provideFakeWalletClient(override?: Partial<WalletRunResult>) {
	return { walletClient: FakeWalletClient(override) };
}

/** Thin accessor for use inside `runInContext`. */
export function walletClient(): WalletClient {
	return providerCtx<WalletClientCtx>().walletClient;
}
