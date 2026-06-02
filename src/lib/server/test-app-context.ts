import type { AppContext } from './app-context.js';
import { provideFakeTransactionServiceClient } from './domain/exchange-runner/index.js';
import { provideFakeIssuerRunner } from './domain/issuer-runner/index.js';
import { FakeIdService } from './services/id-service/id-service.js';
import { SilentLoggerService } from './services/logging/logger-service.js';
import { FakeTimeService } from './services/time-service/time-service.js';

/** Builds the test AppContext: silent logger, fixed clock, deterministic IDs, in-memory transaction-service fake, in-memory verifier-core fake. */
export function TestAppContext(_env: Record<string, unknown>): AppContext {
	const exchangeRunner = provideFakeTransactionServiceClient({ enabled: true });
	const issuerRunner = provideFakeIssuerRunner();
	return {
		logger: SilentLoggerService(),
		timeService: FakeTimeService(new Date('2026-05-09T00:00:00Z')),
		idService: FakeIdService(),
		...exchangeRunner,
		...issuerRunner
	};
}
