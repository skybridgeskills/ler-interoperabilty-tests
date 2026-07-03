import type { AppContext } from './app-context.js';
import { provideRealTransactionServiceClient } from './domain/exchange-runner/index.js';
import { provideRealIssuerRunner } from './domain/issuer-runner/index.js';
import {
	provideRealOid4IssuerFlow,
	provideRealVcalmIssuerFlow,
	provideRealWalletClient
} from './domain/wallet-client/index.js';
import { RealIdService } from './services/id-service/id-service.js';
import { PinoLoggerService } from './services/logging/logger-service.js';
import { RealTimeService } from './services/time-service/time-service.js';

/**
 * Builds the hosted AppContext: plain JSON pino logger (no pretty transport,
 * suited to log aggregation), real wall clock, real IDs, real
 * transaction-service client, real issuer-runner. Identical to the dev context
 * except for the logger output format.
 */
export function HostedAppContext(env: Record<string, unknown>): AppContext {
	const exchangeRunner = provideRealTransactionServiceClient(env);
	const issuerRunner = provideRealIssuerRunner();
	const walletClient = provideRealWalletClient(exchangeRunner.exchangeRunnerConfig);
	const vcalmIssuerFlow = provideRealVcalmIssuerFlow();
	const oid4IssuerFlow = provideRealOid4IssuerFlow();
	return {
		logger: PinoLoggerService({
			level: typeof env.LOG_LEVEL === 'string' ? env.LOG_LEVEL : 'info',
			pretty: false
		}),
		timeService: RealTimeService(),
		idService: RealIdService(),
		...exchangeRunner,
		...issuerRunner,
		...walletClient,
		...vcalmIssuerFlow,
		...oid4IssuerFlow
	};
}
