import type { ExchangeRunnerConfig } from './domain/exchange-runner/exchange-runner-config.js';
import type { TransactionServiceClient } from './domain/exchange-runner/transaction-service-client.js';
import type { IssuerRunner } from './domain/issuer-runner/issuer-runner.js';
import type { VerifierRunner } from './domain/verifier-runner/verifier-runner.js';
import type {
	Oid4IssuerFlow,
	VcalmIssuerFlow,
	WalletClient
} from './domain/wallet-client/index.js';
import type { IdService } from './services/id-service/id-service.js';
import type { LoggerService } from './services/logging/logger-service.js';
import type { TimeService } from './services/time-service/time-service.js';
import { panic } from './util/panic.js';
import { contextStore, providerCtx } from './util/provider/provider-ctx.js';

/**
 * Day-one application context. Add new services here (and to the dev/test
 * builders) when they need to be injectable across requests.
 */
export interface AppContext {
	logger: LoggerService;
	timeService: TimeService;
	idService: IdService;
	transactionServiceClient: TransactionServiceClient;
	exchangeRunnerConfig: ExchangeRunnerConfig;
	issuerRunner: IssuerRunner;
	verifierRunner: VerifierRunner;
	walletClient: WalletClient;
	vcalmIssuerFlow: VcalmIssuerFlow;
	oid4IssuerFlow: Oid4IssuerFlow;
}

/**
 * Read the current AppContext from AsyncLocalStorage. Throws helpfully if
 * called outside a `runInContext` scope — that almost always indicates a
 * missing test fixture or an entry point that forgot to wrap its handler.
 */
export function appContext(): AppContext {
	if (!contextStore.getStore()) {
		panic('No app context present. Ensure runInContext() is called before accessing appContext().');
	}
	return providerCtx<AppContext>();
}
