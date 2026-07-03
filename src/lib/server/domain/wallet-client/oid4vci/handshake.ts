/**
 * Shared OID4VCI 1.0 pre-authorized-code holder handshake helpers, extracted from
 * {@link Oid4vciAcceptanceDriver} so the never-throw issuer-flow driver can reuse the exact
 * offer-parse / metadata-discovery / token / nonce / credential-request / credential-extract
 * logic. These helpers throw on any non-2xx (the acceptance driver relies on that); the
 * issuer-flow driver wraps its own HTTP calls to observe and never throw, reusing the pure
 * parsing helpers ({@link parseOfferLink}, {@link wellKnownMetadataUrl}, {@link extractCredential}).
 */

type FetchLike = typeof fetch;

export const PRE_AUTH_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';

export type CredentialOffer = {
	credential_issuer: string;
	credential_configuration_ids?: string[];
	grants?: Record<string, { 'pre-authorized_code'?: string }>;
};

/** The pre-authorized code from a credential offer, if the pre-auth grant is present. */
export function preAuthorizedCodeOf(offer: CredentialOffer): string | undefined {
	return offer.grants?.[PRE_AUTH_GRANT]?.['pre-authorized_code'];
}

/**
 * OID4VCI 1.0 §12.2.2 / RFC 8615 metadata URL: insert the well-known path segment
 * between the host and the (optional) path of the Credential Issuer Identifier, so a
 * path-scoped (e.g. per-exchange) issuer identifier is preserved as a suffix rather than
 * being forced to the domain root.
 *   https://host/tenant/abc  +  openid-credential-issuer
 *     -> https://host/.well-known/openid-credential-issuer/tenant/abc
 */
export function wellKnownMetadataUrl(issuerIdentifier: string, suffix: string): string {
	const u = new URL(issuerIdentifier);
	const path = u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '');
	return `${u.origin}/.well-known/${suffix}${path}`;
}

export type ParsedOfferLink =
	| { kind: 'inline'; offer: CredentialOffer }
	| { kind: 'uri'; offerUri: string };

/**
 * Parse a pasted `openid-credential-offer://` link (or a bare offer object) into either an
 * inline offer or a `credential_offer_uri` to fetch. Supports:
 *   - `…?credential_offer_uri=<url-encoded URL>`   → fetch the URL
 *   - `…?credential_offer=<url-encoded JSON>`       → inline offer
 *   - a bare offer object (or a bare JSON offer string)
 */
export function parseOfferLink(link: string | CredentialOffer): ParsedOfferLink {
	if (link && typeof link === 'object') return { kind: 'inline', offer: link };
	const raw = String(link);
	const params = offerParams(raw);
	if (params) {
		const inline = params.get('credential_offer');
		if (inline) return { kind: 'inline', offer: JSON.parse(inline) as CredentialOffer };
		const uri = params.get('credential_offer_uri');
		if (uri) return { kind: 'uri', offerUri: uri };
	}
	const trimmed = raw.trim();
	if (trimmed.startsWith('{')) {
		return { kind: 'inline', offer: JSON.parse(trimmed) as CredentialOffer };
	}
	throw new Error('OID4VCI offer link has no credential_offer or credential_offer_uri.');
}

function offerParams(link: string): URLSearchParams | undefined {
	try {
		return new URL(link).searchParams;
	} catch {
		const q = link.indexOf('?');
		return q === -1 ? undefined : new URLSearchParams(link.slice(q + 1));
	}
}

/** Resolve a pasted offer link (or bare offer) to the credential-offer object. Throws on failure. */
export async function fetchOffer(
	doFetch: FetchLike,
	link: string | CredentialOffer
): Promise<CredentialOffer> {
	const parsed = parseOfferLink(link);
	if (parsed.kind === 'inline') return parsed.offer;
	return getJson(doFetch, parsed.offerUri) as Promise<CredentialOffer>;
}

/** GET/POST JSON; throws on any non-2xx (the acceptance driver relies on this). */
export async function getJson(
	doFetch: FetchLike,
	url: string,
	opts: { method?: string; accessToken?: string; json?: unknown } = {}
): Promise<Record<string, unknown>> {
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
	if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
	const res = await doFetch(url, {
		method: opts.method ?? (opts.json !== undefined ? 'POST' : 'GET'),
		headers,
		body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined
	});
	if (!res.ok) throw new Error(`OID4VCI request to ${url} responded ${res.status}.`);
	return (await res.json()) as Record<string, unknown>;
}

/** POST an `application/x-www-form-urlencoded` body (pre-auth token grant). Throws on non-2xx. */
export async function postForm(
	doFetch: FetchLike,
	url: string,
	form: Record<string, string>
): Promise<Record<string, unknown>> {
	const res = await doFetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
		body: new URLSearchParams(form)
	});
	if (!res.ok) throw new Error(`OID4VCI token request responded ${res.status}.`);
	return (await res.json()) as Record<string, unknown>;
}

/** Pull the issued VC from an OID4VCI credential response (single or `credentials[]` form). */
export function extractCredential(response: Record<string, unknown>): unknown {
	if (response.credential) return response.credential;
	const credentials = response.credentials as Array<{ credential?: unknown }> | undefined;
	if (Array.isArray(credentials) && credentials.length) {
		return credentials[0]?.credential ?? credentials[0];
	}
	return undefined;
}
