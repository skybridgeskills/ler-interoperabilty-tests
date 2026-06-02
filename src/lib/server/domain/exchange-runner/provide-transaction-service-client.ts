import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import { ExchangeRunnerConfig, parseExchangeRunnerConfig } from './exchange-runner-config.js';
import {
	FakeTransactionServiceClient,
	type FakeTransactionServiceClient as FakeTransactionServiceClientType
} from './fake-transaction-service-client.js';
import {
	RealTransactionServiceClient,
	type TransactionServiceClient
} from './transaction-service-client.js';

export type TransactionServiceClientCtx = {
	transactionServiceClient: TransactionServiceClient;
	exchangeRunnerConfig: ExchangeRunnerConfig;
};

/** Dev / production wiring — talks to the real transaction-service container. */
export function provideRealTransactionServiceClient(env: Record<string, unknown>) {
	const exchangeRunnerConfig = parseExchangeRunnerConfig(env);
	return {
		exchangeRunnerConfig,
		transactionServiceClient: RealTransactionServiceClient(exchangeRunnerConfig)
	};
}

/** Test wiring — in-memory fake. Tests recover the test hooks via {@link asFakeTransactionServiceClient}. */
export function provideFakeTransactionServiceClient(opts: { enabled?: boolean } = {}) {
	const exchangeRunnerConfig = ExchangeRunnerConfig({
		enabled: opts.enabled ?? true,
		transactionServiceUrl: 'http://fake.test',
		tenantName: 'default',
		tenantToken: 'fake-token',
		exchangeHost: 'http://fake.test'
	});
	return {
		exchangeRunnerConfig,
		transactionServiceClient: FakeTransactionServiceClient()
	};
}

/** Thin accessor for use inside `runInContext`. */
export function transactionServiceClient(): TransactionServiceClient {
	return providerCtx<TransactionServiceClientCtx>().transactionServiceClient;
}

/** Thin accessor for the runner config. */
export function exchangeRunnerConfig(): ExchangeRunnerConfig {
	return providerCtx<TransactionServiceClientCtx>().exchangeRunnerConfig;
}

/**
 * Recover the FakeTransactionServiceClient surface from the provider when you
 * control the chain. Throws if the underlying client is real.
 */
export function asFakeTransactionServiceClient(
	client: TransactionServiceClient
): FakeTransactionServiceClientType {
	if (typeof (client as FakeTransactionServiceClientType).advanceToActive !== 'function') {
		throw new Error('asFakeTransactionServiceClient called on a non-fake client');
	}
	return client as FakeTransactionServiceClientType;
}
