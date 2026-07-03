import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';
import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import {
	Oid4IssuerFlowDriver,
	type Oid4IssuerFlow,
	type Oid4IssuerFlowRunResult
} from './drivers/oid4-issuer-flow.js';
import { FakeOid4IssuerFlow } from './fake-oid4-issuer-flow.js';

export type Oid4IssuerFlowCtx = {
	oid4IssuerFlow: Oid4IssuerFlow;
};

/** Dev / production wiring — real driver (WalletCrypto + real fetch against the pasted offer URL). */
export function provideRealOid4IssuerFlow(): Oid4IssuerFlowCtx {
	const crypto = WalletCrypto();
	return { oid4IssuerFlow: Oid4IssuerFlowDriver({ crypto }) };
}

/** Test wiring — deterministic in-memory flow. */
export function provideFakeOid4IssuerFlow(
	override?: Partial<Oid4IssuerFlowRunResult>
): Oid4IssuerFlowCtx {
	return { oid4IssuerFlow: FakeOid4IssuerFlow(override) };
}

/** Thin accessor for use inside `runInContext`. */
export function oid4IssuerFlow(): Oid4IssuerFlow {
	return providerCtx<Oid4IssuerFlowCtx>().oid4IssuerFlow;
}
