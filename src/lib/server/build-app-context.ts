import type { AppContext } from './app-context.js';
import { parseBaseEnv } from './app-env.js';

/**
 * Build the per-process AppContext from environment variables. Branches by
 * `CONTEXT` and dynamically imports the matching builder so dev-only deps
 * (like pino-pretty) don't show up in test bundles.
 */
export async function buildAppContext(env: Record<string, unknown>): Promise<AppContext> {
	const { CONTEXT } = parseBaseEnv(env);
	switch (CONTEXT) {
		case 'dev': {
			const { DevAppContext } = await import('./dev-app-context.js');
			return DevAppContext(env);
		}
		case 'test': {
			const { TestAppContext } = await import('./test-app-context.js');
			return TestAppContext(env);
		}
		default: {
			const _never: never = CONTEXT;
			throw new Error(`Unknown CONTEXT: ${_never}`);
		}
	}
}
