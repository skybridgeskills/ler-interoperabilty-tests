import type { Cookies } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';

import { load } from './+layout.server.js';

const cookies = (value: string | undefined) =>
	({ get: (name: string) => (name === 'lits.perspective' ? value : undefined) }) as Cookies;

describe('root layout load', () => {
	it('passes a valid Perspective cookie through', () => {
		expect(load({ cookies: cookies('evaluator') })).toEqual({ perspective: 'evaluator' });
		expect(load({ cookies: cookies('dismissed') })).toEqual({ perspective: 'dismissed' });
	});

	it('treats a missing or unknown value as unset', () => {
		expect(load({ cookies: cookies(undefined) })).toEqual({ perspective: undefined });
		expect(load({ cookies: cookies('admin') })).toEqual({ perspective: undefined });
	});
});
