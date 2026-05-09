import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { env } from '$env/dynamic/private';

const ctxPromise = buildAppContext(env);

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
