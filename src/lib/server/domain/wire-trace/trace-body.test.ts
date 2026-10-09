import { describe, expect, it } from 'vitest';

import { TRACE_BODY_LIMIT, traceBody } from './trace-body.js';

describe('traceBody', () => {
	it('passes a small body through unchanged, as an object', () => {
		const body = { error: 'server_error', error_description: 'template render failed' };
		expect(traceBody(body)).toEqual({ body });
	});

	it('returns nothing for an absent body', () => {
		expect(traceBody(undefined)).toEqual({});
	});

	it('keeps `null` and other falsy JSON values, which are real responses', () => {
		expect(traceBody(null)).toEqual({ body: null });
		expect(traceBody(0)).toEqual({ body: 0 });
		expect(traceBody('')).toEqual({ body: '' });
	});

	it('truncates an oversized body to a STRING and reports the original size', () => {
		const huge = { blob: 'x'.repeat(TRACE_BODY_LIMIT * 3) };
		const originalBytes = Buffer.byteLength(JSON.stringify(huge), 'utf8');

		const result = traceBody(huge);

		// A truncated JSON document is not valid JSON — handing back a
		// half-parsed object would misrepresent what arrived.
		expect(typeof result.body).toBe('string');
		expect((result.body as string).length).toBe(TRACE_BODY_LIMIT);
		expect(result.truncated).toEqual({ originalBytes });
		expect(originalBytes).toBeGreaterThan(TRACE_BODY_LIMIT);
	});

	it('does not truncate a body exactly at the cap', () => {
		// `"…"` — the quotes are two of the serialised bytes.
		const exact = 'y'.repeat(TRACE_BODY_LIMIT - 2);
		expect(traceBody(exact)).toEqual({ body: exact });
	});

	it('yields no body rather than throwing on a value that cannot be serialised', () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		expect(() => traceBody(cyclic)).not.toThrow();
		expect(traceBody(cyclic)).toEqual({});

		// `JSON.stringify` returns `undefined` for these rather than throwing.
		expect(traceBody(() => 'nope')).toEqual({});
	});
});
