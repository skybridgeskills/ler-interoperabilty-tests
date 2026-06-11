import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { VerifyResult, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import {
	ExchangeChecker,
	type ExchangeChecker as ExchangeCheckerType,
	type WalletExchangeView,
	type WalletReport
} from '$lib/server/domain/wallet-runner/index.js';

import type { DriverExchange, ProtocolDriver } from './protocol-driver.js';

/** Result of one wallet acceptance run: what happened + the conformance report. */
export type WalletRunResult = {
	exchange: WalletExchangeView;
	credential?: unknown;
	verify: VerifyResult;
	report: WalletReport;
	holder?: { did: string; cryptosuite: WalletCryptosuite };
	presentation?: unknown;
};

export type AcceptCredentialArgs = {
	profile: ProfileSlug;
	cryptosuite?: WalletCryptosuite;
	exchange: DriverExchange;
};

/** The wallet client: completes a holder flow for a profile and reports conformance. */
export interface WalletClient {
	acceptCredential(args: AcceptCredentialArgs): Promise<WalletRunResult>;
}

/**
 * Real wallet client: dispatches to the registered per-profile {@link ProtocolDriver} to
 * complete the holder flow, then runs the {@link ExchangeChecker} over the observed exchange +
 * credential to produce a conformance report. Drivers are injected by the per-protocol
 * milestones (M3/M4/M5).
 */
export function RealWalletClient(deps: {
	drivers: Partial<Record<ProfileSlug, ProtocolDriver>>;
	checker?: ExchangeCheckerType;
}): WalletClient {
	const checker = deps.checker ?? ExchangeChecker();

	async function acceptCredential(args: AcceptCredentialArgs): Promise<WalletRunResult> {
		const driver = deps.drivers[args.profile];
		if (!driver) {
			throw new Error(`No wallet protocol driver registered for profile '${args.profile}'.`);
		}
		const result = await driver.runAcceptance({
			profile: args.profile,
			cryptosuite: args.cryptosuite ?? 'eddsa-rdfc-2022',
			exchange: args.exchange
		});
		const report = checker.run({
			role: 'wallet',
			workflow: 'credential-acceptance',
			profile: args.profile,
			ctx: {
				profile: args.profile,
				exchange: result.exchange,
				credential: result.credential,
				presentation: result.presentation,
				verify: result.verify,
				holder: result.holder
			}
		});
		return { ...result, report };
	}

	return { acceptCredential };
}
export type RealWalletClient = ReturnType<typeof RealWalletClient>;
