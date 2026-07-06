import type { AppContext } from './app-context.js';
import { provideRealTransactionServiceClient } from './domain/exchange-runner/index.js';
import { provideRealIssuerRunner } from './domain/issuer-runner/index.js';
import { provideRealVerifierRunner } from './domain/verifier-runner/index.js';
import {
	provideRealOid4IssuerFlow,
	provideRealVcalmIssuerFlow,
	provideRealWalletClient
} from './domain/wallet-client/index.js';
import { provideHealthRegistry } from './health/provide-health-registry.js';
import { RealIdService } from './services/id-service/id-service.js';
import { PinoLoggerService } from './services/logging/logger-service.js';
import { RealTimeService } from './services/time-service/time-service.js';

/** Builds the dev AppContext: pretty pino logger, real wall clock, real IDs, real transaction-service client, real issuer-runner. */
export function DevAppContext(env: Record<string, unknown>): AppContext {
	const exchangeRunner = provideRealTransactionServiceClient(env);
	const issuerRunner = provideRealIssuerRunner();
	const verifierRunner = provideRealVerifierRunner();
	const walletClient = provideRealWalletClient(exchangeRunner.exchangeRunnerConfig);
	const vcalmIssuerFlow = provideRealVcalmIssuerFlow();
	const oid4IssuerFlow = provideRealOid4IssuerFlow();
	const health = provideHealthRegistry(exchangeRunner.exchangeRunnerConfig);
	return {
		logger: PinoLoggerService({
			level: typeof env.LOG_LEVEL === 'string' ? env.LOG_LEVEL : 'info',
			pretty: true
		}),
		timeService: RealTimeService(),
		idService: RealIdService(),
		...exchangeRunner,
		...health,
		...issuerRunner,
		...verifierRunner,
		...walletClient,
		...vcalmIssuerFlow,
		...oid4IssuerFlow
	};
}
