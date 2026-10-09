import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPerspectiveStore } from './perspective-store.svelte.js';

describe('createPerspectiveStore', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is unset and undecided with no cookie', () => {
		const store = createPerspectiveStore(undefined);
		expect(store.current).toBeUndefined();
		expect(store.undecided).toBe(true);
	});

	it('reads a chosen Perspective from the cookie value', () => {
		expect(createPerspectiveStore('builder').current).toBe('builder');
		expect(createPerspectiveStore('evaluator').current).toBe('evaluator');
		expect(createPerspectiveStore('evaluator').undecided).toBe(false);
	});

	it('treats dismissed as unset but decided', () => {
		const store = createPerspectiveStore('dismissed');
		expect(store.current).toBeUndefined();
		expect(store.undecided).toBe(false);
	});

	it('choose sets the Perspective; dismiss clears it and stays decided', () => {
		const store = createPerspectiveStore(undefined);
		store.choose('evaluator');
		expect(store.current).toBe('evaluator');
		expect(store.undecided).toBe(false);
		store.dismiss();
		expect(store.current).toBeUndefined();
		expect(store.undecided).toBe(false);
	});

	it('writes the cookie back on change', () => {
		const document = { cookie: '' };
		vi.stubGlobal('document', document);
		vi.stubGlobal('location', { protocol: 'https:' });
		createPerspectiveStore(undefined).choose('builder');
		expect(document.cookie).toBe(
			'lits.perspective=builder; Max-Age=31536000; Path=/; SameSite=Lax; Secure'
		);
	});

	it('omits Secure over http', () => {
		const document = { cookie: '' };
		vi.stubGlobal('document', document);
		vi.stubGlobal('location', { protocol: 'http:' });
		createPerspectiveStore('builder').dismiss();
		expect(document.cookie).toBe(
			'lits.perspective=dismissed; Max-Age=31536000; Path=/; SameSite=Lax'
		);
	});
});
