import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import type { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import { Oid4vciAcceptanceDriver } from './drivers/oid4vci-acceptance.js';
import { Oid4vpPresentationDriver } from './drivers/oid4vp-presentation.js';
import { VcalmAcceptanceDriver } from './drivers/vcalm-acceptance.js';
import { makeHttpContinueExchange } from './http-continue-exchange.js';
import { RealWalletClient } from './wallet-client.js';
import type { WalletClient } from './wallet-client.js';

/**
 * Assemble the real wallet client for an environment: one shared WalletCrypto + an HTTP
 * continue-exchange transport, wired to the per-protocol drivers (VCALM via VC-API exchange
 * continuation; OID4VCI via the pre-authorized-code flow; OID4VP presentation via direct_post).
 */
export function buildWalletClient(config: ExchangeRunnerConfig): WalletClient {
	const crypto = WalletCrypto();
	const continueExchange = makeHttpContinueExchange(config);
	return RealWalletClient({
		drivers: {
			vcalm: VcalmAcceptanceDriver({ crypto, continueExchange }),
			oid4: Oid4vciAcceptanceDriver({ crypto })
		},
		presentationDriver: Oid4vpPresentationDriver({ crypto })
	});
}
