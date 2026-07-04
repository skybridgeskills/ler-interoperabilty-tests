import { decodeJwtPayload } from './resolve-request.js';

/**
 * The result of parsing an operator-pasted OID4VP authorization request input:
 * an inline request object to validate, a `request_uri` to fetch, or an
 * `invalid` explanation to surface (never thrown — the floor checks report it).
 */
export type ParsedAuthorizationRequestLink =
	| { kind: 'inline'; request: unknown }
	| { kind: 'by-reference'; requestUri: string }
	| { kind: 'invalid'; reason: string };

/**
 * Parse a pasted OID4VP authorization request in any of its accepted forms:
 *
 * - `openid4vp://?…` (also `openid4vp://authorize?…`) deep link — its query
 *   carries either `request_uri` (by reference), `request` (a request-object
 *   JWT by value; payload decoded, signature unverified by design), or the
 *   inline request parameters with a JSON-encoded `presentation_definition`.
 *   `presentation_definition_uri` is not supported and is rejected clearly.
 * - a bare `http(s)://…` URL — treated as a `request_uri`.
 * - raw JSON text — the inline request object itself.
 *
 * Mirrors `parseOfferLink` (custom scheme, so plain string handling — never
 * `URL`-only parsing). Returns a discriminated result instead of throwing.
 */
export function parseAuthorizationRequestLink(input: string): ParsedAuthorizationRequestLink {
	const trimmed = input.trim();
	if (trimmed === '') {
		return { kind: 'invalid', reason: 'The authorization request input is empty.' };
	}
	if (/^openid4vp:/i.test(trimmed)) return parseDeepLink(trimmed);
	if (/^https?:\/\//i.test(trimmed)) return { kind: 'by-reference', requestUri: trimmed };
	if (trimmed.startsWith('{')) {
		try {
			return { kind: 'inline', request: JSON.parse(trimmed) as unknown };
		} catch {
			return { kind: 'invalid', reason: 'The pasted request is not valid JSON.' };
		}
	}
	return {
		kind: 'invalid',
		reason:
			'Unrecognized input — paste an openid4vp:// link, a request_uri URL, or the request JSON.'
	};
}

function parseDeepLink(link: string): ParsedAuthorizationRequestLink {
	const queryStart = link.indexOf('?');
	if (queryStart === -1) {
		return { kind: 'invalid', reason: 'The openid4vp:// link carries no query parameters.' };
	}
	const params = new URLSearchParams(link.slice(queryStart + 1));

	const requestUri = params.get('request_uri');
	if (requestUri) return { kind: 'by-reference', requestUri };

	const requestJwt = params.get('request');
	if (requestJwt) {
		try {
			return { kind: 'inline', request: decodeJwtPayload(requestJwt) };
		} catch {
			return {
				kind: 'invalid',
				reason: 'The `request` parameter is not a decodable request-object JWT.'
			};
		}
	}

	if (params.has('presentation_definition_uri')) {
		return {
			kind: 'invalid',
			reason:
				'`presentation_definition_uri` is not supported — include the presentation_definition by value, or pass the request via request_uri.'
		};
	}

	return inlineFromParams(params);
}

/** Build an inline request object from deep-link query parameters. */
function inlineFromParams(params: URLSearchParams): ParsedAuthorizationRequestLink {
	const request: Record<string, unknown> = {};
	for (const [key, value] of params) {
		if (key === 'presentation_definition') {
			try {
				request[key] = JSON.parse(value) as unknown;
			} catch {
				return {
					kind: 'invalid',
					reason: 'The `presentation_definition` parameter is not valid JSON.'
				};
			}
		} else {
			request[key] = value;
		}
	}
	if (Object.keys(request).length === 0) {
		return { kind: 'invalid', reason: 'The openid4vp:// link carries no request parameters.' };
	}
	return { kind: 'inline', request };
}
