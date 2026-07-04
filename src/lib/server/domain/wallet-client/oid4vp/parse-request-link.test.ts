import { describe, expect, it } from 'vitest';

import { parseAuthorizationRequestLink } from './parse-request-link.js';

const PD = { id: 'pd-1', input_descriptors: [{ id: 'ob3' }] };

describe('parseAuthorizationRequestLink', () => {
	it('parses a deep link with request_uri as by-reference', () => {
		const result = parseAuthorizationRequestLink(
			'openid4vp://?client_id=https%3A%2F%2Fv.test&request_uri=https%3A%2F%2Fv.test%2Freq%2F1'
		);
		expect(result).toEqual({ kind: 'by-reference', requestUri: 'https://v.test/req/1' });
	});

	it('tolerates an authorize authority in the deep link', () => {
		const result = parseAuthorizationRequestLink(
			'openid4vp://authorize?request_uri=https%3A%2F%2Fv.test%2Freq'
		);
		expect(result).toEqual({ kind: 'by-reference', requestUri: 'https://v.test/req' });
	});

	it('parses inline deep-link params with a JSON presentation_definition', () => {
		const link =
			'openid4vp://?client_id=https%3A%2F%2Fv.test&response_uri=https%3A%2F%2Fv.test%2Fcb' +
			'&response_mode=direct_post&nonce=n-1' +
			`&presentation_definition=${encodeURIComponent(JSON.stringify(PD))}`;
		const result = parseAuthorizationRequestLink(link);
		expect(result).toEqual({
			kind: 'inline',
			request: {
				client_id: 'https://v.test',
				response_uri: 'https://v.test/cb',
				response_mode: 'direct_post',
				nonce: 'n-1',
				presentation_definition: PD
			}
		});
	});

	it('decodes a request-object JWT passed by value', () => {
		const payload = Buffer.from(
			JSON.stringify({ client_id: 'https://v.test', nonce: 'n' })
		).toString('base64url');
		const jwt = `eyJhbGciOiJFUzI1NiJ9.${payload}.sig`;
		const result = parseAuthorizationRequestLink(`openid4vp://?request=${jwt}`);
		expect(result).toEqual({
			kind: 'inline',
			request: { client_id: 'https://v.test', nonce: 'n' }
		});
	});

	it('rejects presentation_definition_uri with a clear message', () => {
		const result = parseAuthorizationRequestLink(
			'openid4vp://?client_id=x&presentation_definition_uri=https%3A%2F%2Fv.test%2Fpd'
		);
		expect(result.kind).toBe('invalid');
		expect(result).toMatchObject({
			reason: expect.stringContaining('presentation_definition_uri')
		});
	});

	it('treats a bare https URL as a request_uri', () => {
		expect(parseAuthorizationRequestLink('https://v.test/request/42')).toEqual({
			kind: 'by-reference',
			requestUri: 'https://v.test/request/42'
		});
	});

	it('parses raw JSON text as an inline request', () => {
		const request = { client_id: 'x', presentation_definition: PD };
		expect(parseAuthorizationRequestLink(JSON.stringify(request))).toEqual({
			kind: 'inline',
			request
		});
	});

	it('reports invalid inline JSON', () => {
		expect(parseAuthorizationRequestLink('{ not json').kind).toBe('invalid');
	});

	it('reports a malformed presentation_definition parameter', () => {
		const result = parseAuthorizationRequestLink('openid4vp://?presentation_definition=%7Bnope');
		expect(result).toMatchObject({ kind: 'invalid', reason: expect.stringContaining('JSON') });
	});

	it('reports a deep link with no query at all', () => {
		expect(parseAuthorizationRequestLink('openid4vp://').kind).toBe('invalid');
	});

	it('reports an undecodable request JWT', () => {
		expect(parseAuthorizationRequestLink('openid4vp://?request=not-a-jwt').kind).toBe('invalid');
	});

	it('reports garbage and empty inputs', () => {
		expect(parseAuthorizationRequestLink('hello world').kind).toBe('invalid');
		expect(parseAuthorizationRequestLink('   ').kind).toBe('invalid');
	});
});
