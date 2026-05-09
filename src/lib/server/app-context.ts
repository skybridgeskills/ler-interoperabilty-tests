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
