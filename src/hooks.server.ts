import type { ServerInit } from '@sveltejs/kit';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { provideHealthLogging } from '$lib/server/health/provide-health-logging.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { env } from '$env/dynamic/private';

const ctxPromise = buildAppContext(env);

export const init: ServerInit = async () => {
	const ctx = await ctxPromise;
	if (env.CONTEXT !== 'test') {
		// Process-lifetime timer; the disposer is intentionally not retained (the
		// server context is never torn down). `provideHealthLogging` also no-ops
		// when disabled via env, so this guard is belt-and-suspenders.
		provideHealthLogging({ logger: ctx.logger, healthRegistry: ctx.healthRegistry }, { env });
	}
};

export async function handle({
	event,
	resolve
}: {
	event: import('@sveltejs/kit').RequestEvent;
	resolve: (event: import('@sveltejs/kit').RequestEvent) => Promise<Response> | Response;
}) {
	const ctx = await ctxPromise;
	event.locals.requestId = ctx.idService.short('req');
	return runInContext(ctx, () => resolve(event));
}
