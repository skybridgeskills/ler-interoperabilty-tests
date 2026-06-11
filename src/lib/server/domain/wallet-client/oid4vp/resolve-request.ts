type FetchLike = typeof fetch;

/**
 * Resolve an OID4VP authorization request from either an inline `request` object or a
 * `request_uri` the verifier passed by reference. When `requestUri` is given, the request is
 * fetched server-side (the wallet is server-only — this also avoids browser CORS) and parsed as
 * a JSON request object, or as a signed request object (JWT) by decoding its payload.
 *
 * NOTE (v1): a JWT request object's signature is **not** verified — only its payload is decoded.
 * Signed-request-object verification is a follow-up (see the M5 plan's out-of-scope list).
 */
export async function resolveAuthorizationRequest(
	args: { request?: unknown; requestUri?: string },
	fetchImpl: FetchLike = fetch
): Promise<unknown> {
	if (args.request !== undefined && args.request !== null) return args.request;
	if (!args.requestUri) {
		throw new Error('Provide either an inline `request` or a `requestUri`.');
	}
	const res = await fetchImpl(args.requestUri, {
		headers: { Accept: 'application/json, application/oauth-authz-req+jwt' }
	});
	if (!res.ok) {
		throw new Error(`request_uri fetch responded ${res.status}.`);
	}
	const text = (await res.text()).trim();
	if (text.startsWith('{')) {
		return JSON.parse(text) as unknown;
	}
	return decodeJwtPayload(text);
}

/** Decode (without verifying) the payload of a compact JWS request object. */
function decodeJwtPayload(jwt: string): unknown {
	const parts = jwt.split('.');
	if (parts.length < 2 || !parts[1]) {
		throw new Error('request_uri returned an unrecognized request object (not JSON or a JWT).');
	}
	const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
	return JSON.parse(payload) as unknown;
}
