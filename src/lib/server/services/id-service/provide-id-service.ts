import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import { FakeIdService, RealIdService, type IdService } from './id-service.js';

/** Wires the real ID service backed by `crypto.randomUUID()`. */
export function provideIdService() {
	return { idService: RealIdService() };
}

/** Wires the deterministic test ID service. */
export function provideFakeIdService() {
	return { idService: FakeIdService() };
}

export type IdServiceCtx = { idService: IdService };

/** Thin accessor for use inside `runInContext`. */
export function idService(): IdService {
	return providerCtx<IdServiceCtx>().idService;
}
