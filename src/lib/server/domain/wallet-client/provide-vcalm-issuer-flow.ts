import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';
import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import {
	VcalmIssuerFlowDriver,
	type IssuerFlowRunResult,
	type VcalmIssuerFlow
} from './drivers/vcalm-issuer-flow.js';
import { makeHttpExchangeFlowTransport } from './exchange-flow-transport.js';
import { FakeVcalmIssuerFlow } from './fake-vcalm-issuer-flow.js';

export type VcalmIssuerFlowCtx = {
	vcalmIssuerFlow: VcalmIssuerFlow;
};

/** Dev / production wiring — real driver (WalletCrypto + HTTP user-URL transport, no token). */
export function provideRealVcalmIssuerFlow(): VcalmIssuerFlowCtx {
	const crypto = WalletCrypto();
	const transport = makeHttpExchangeFlowTransport();
	return { vcalmIssuerFlow: VcalmIssuerFlowDriver({ crypto, transport }) };
}

/** Test wiring — deterministic in-memory flow. */
export function provideFakeVcalmIssuerFlow(
	override?: Partial<IssuerFlowRunResult>
): VcalmIssuerFlowCtx {
	return { vcalmIssuerFlow: FakeVcalmIssuerFlow(override) };
}

/** Thin accessor for use inside `runInContext`. */
export function vcalmIssuerFlow(): VcalmIssuerFlow {
	return providerCtx<VcalmIssuerFlowCtx>().vcalmIssuerFlow;
}
