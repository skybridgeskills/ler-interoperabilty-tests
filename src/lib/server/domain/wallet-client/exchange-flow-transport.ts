import tls from 'node:tls';

/**
 * Transport for the reversed VC-API exchange flows, where the suite acts as
 * holder against an exchange living on the user's system — the issuer-flow
 * (test wallet verifies the issuer) and the verifier-flow (test wallet presents
 * to the verifier). Unlike
 * {@link makeHttpContinueExchange} (which talks to the *suite's own* transaction-service with a
 * tenant token), this transport participates in an exchange that lives on the **user's** system:
 * it fetches the absolute interaction URL the user pasted, discovers the absolute `vcapi` URL,
 * and POSTs to it with **no Authorization header**.
 *
 * SECURITY (accepted, see plan Q8): both {@link probeTls} and the fetches reach a user-supplied
 * host — an SSRF surface. This is an intentional trade-off for a local developer testing tool
 * (the same server already reaches the local transaction-service); no allow-listing is applied.
 */
export type TlsProbeResult = {
	ok: boolean;
	protocol?: string;
	atLeastTls12: boolean;
	error?: string;
};

/** Result of fetching the user-supplied interaction URL. Never thrown — failures are reported. */
export type FetchInteractionResult = {
	ok: boolean;
	status: number;
	protocols?: Record<string, unknown>;
	vcapiUrl?: string;
	tls?: TlsProbeResult;
	rawBody: unknown;
	error?: string;
};

/** Result of a POST to the absolute `vcapi` URL. Never thrown — failures are reported. */
export type PostToVcapiResult = {
	ok: boolean;
	status: number;
	rawBody: unknown;
	error?: string;
};

/** The transport the reversed-flow drivers (issuer-flow, verifier-flow) depend on (real HTTP, or a test fake). */
export interface ExchangeFlowTransport {
	fetchInteractionUrl(url: string): Promise<FetchInteractionResult>;
	postToVcapi(vcapiUrl: string, body: unknown): Promise<PostToVcapiResult>;
}

const TLS_TIMEOUT_MS = 5_000;

/**
 * Probe a host's TLS version by opening a bare TLS socket and reading the negotiated protocol.
 * Resolves (never rejects); `atLeastTls12` is true for TLSv1.2 / TLSv1.3. Only meaningful for
 * https URLs.
 */
export function probeTls(url: string): Promise<TlsProbeResult> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return Promise.resolve({ ok: false, atLeastTls12: false, error: 'Invalid URL.' });
	}
	if (parsed.protocol !== 'https:') {
		return Promise.resolve({
			ok: false,
			atLeastTls12: false,
			error: 'Endpoint is not served over HTTPS.'
		});
	}
	const host = parsed.hostname;
	const port = parsed.port ? Number(parsed.port) : 443;

	return new Promise<TlsProbeResult>((resolve) => {
		let settled = false;
		const finish = (r: TlsProbeResult) => {
			if (settled) return;
			settled = true;
			try {
				socket.end();
			} catch {
				/* ignore */
			}
			resolve(r);
		};

		const socket = tls.connect(
			{ host, port, servername: host, ALPNProtocols: ['http/1.1'] },
			() => {
				const protocol = socket.getProtocol() ?? undefined;
				const atLeastTls12 = protocol === 'TLSv1.2' || protocol === 'TLSv1.3';
				finish({ ok: true, protocol, atLeastTls12 });
			}
		);
		socket.setTimeout(TLS_TIMEOUT_MS, () =>
			finish({ ok: false, atLeastTls12: false, error: 'TLS handshake timed out.' })
		);
		socket.on('error', (e: Error) => finish({ ok: false, atLeastTls12: false, error: e.message }));
	});
}

/** Pull an absolute `vcapi` URL out of an interaction-protocols response (nested or bare). */
function extractVcapiUrl(body: unknown): string | undefined {
	const obj = body as Record<string, unknown> | null;
	const protocols =
		(obj?.protocols as Record<string, unknown> | undefined) ??
		(obj && typeof obj === 'object' ? obj : undefined);
	const vcapi = protocols?.vcapi;
	if (typeof vcapi !== 'string') return undefined;
	try {
		return new URL(vcapi).toString();
	} catch {
		return undefined;
	}
}

async function parseBody(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

/** The real HTTP transport used in dev/production. */
export function makeHttpExchangeFlowTransport(): ExchangeFlowTransport {
	async function fetchInteractionUrl(url: string): Promise<FetchInteractionResult> {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return {
				ok: false,
				status: 0,
				rawBody: null,
				error: 'Interaction URL must be an absolute http(s) URL.'
			};
		}
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return {
				ok: false,
				status: 0,
				rawBody: null,
				error: 'Interaction URL must use http or https.'
			};
		}

		const tlsResult = parsed.protocol === 'https:' ? await probeTls(url) : undefined;

		let res: Response;
		try {
			res = await fetch(url, { headers: { Accept: 'application/json' } });
		} catch (e) {
			return {
				ok: false,
				status: 0,
				tls: tlsResult,
				rawBody: null,
				error: e instanceof Error ? e.message : String(e)
			};
		}
		const rawBody = await parseBody(res);
		const protocols =
			rawBody && typeof rawBody === 'object'
				? (((rawBody as Record<string, unknown>).protocols as Record<string, unknown>) ??
					(rawBody as Record<string, unknown>))
				: undefined;
		return {
			ok: res.ok,
			status: res.status,
			protocols,
			vcapiUrl: extractVcapiUrl(rawBody),
			tls: tlsResult,
			rawBody,
			error: res.ok ? undefined : `Interaction URL responded ${res.status}.`
		};
	}

	async function postToVcapi(vcapiUrl: string, body: unknown): Promise<PostToVcapiResult> {
		let res: Response;
		try {
			res = await fetch(vcapiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify(body ?? {})
			});
		} catch (e) {
			return {
				ok: false,
				status: 0,
				rawBody: null,
				error: e instanceof Error ? e.message : String(e)
			};
		}
		const rawBody = await parseBody(res);
		return {
			ok: res.ok,
			status: res.status,
			rawBody,
			error: res.ok ? undefined : `vcapi endpoint responded ${res.status}.`
		};
	}

	return { fetchInteractionUrl, postToVcapi };
}
