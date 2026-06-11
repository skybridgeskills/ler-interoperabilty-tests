export { RealWalletClient } from './wallet-client.js';
export type {
	WalletClient,
	WalletRunResult,
	WalletPresentResult,
	AcceptCredentialArgs,
	PresentCredentialArgs
} from './wallet-client.js';
export { FakeWalletClient } from './fake-wallet-client.js';
export {
	Oid4vpPresentationDriver,
	type PresentationDriver,
	type SubmitResponse
} from './drivers/oid4vp-presentation.js';
export {
	provideRealWalletClient,
	provideFakeWalletClient,
	walletClient,
	type WalletClientCtx
} from './provide-wallet-client.js';
export { buildWalletClient } from './build-wallet-client.js';
export { VcalmAcceptanceDriver, type ContinueExchange } from './drivers/vcalm-acceptance.js';
export type {
	ProtocolDriver,
	AcceptanceResult,
	AcceptanceDriverInput,
	DriverExchange
} from './protocol-driver.js';
