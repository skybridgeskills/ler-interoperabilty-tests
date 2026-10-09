import { getContext, setContext } from 'svelte';

import type { PerspectiveStore } from './perspective-store.svelte.js';

const KEY = Symbol('perspective');

/** Provide the reader's Perspective store to everything below this component. */
export function setPerspectiveStore(store: PerspectiveStore): PerspectiveStore {
	return setContext(KEY, store);
}

/** The Perspective store provided by the root layout (or a story wrapper). */
export function perspectiveStore(): PerspectiveStore {
	const store = getContext<PerspectiveStore | undefined>(KEY);
	if (!store) throw new Error('perspectiveStore() called outside a provided Perspective store');
	return store;
}
