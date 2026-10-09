/**
 * Hosts recognised as CTDL Credential Registry deployments. Extensible — add
 * new blessed hosts (CASS / CASE / regional registries) here without touching
 * call sites.
 *
 * Copied rather than moved from `issuer-runner/ctdl-allowlist.ts`: this is a
 * pure 20-line helper, the checks now run in the browser, and an `automatic`
 * check may not import from `$lib/server/`. The server copy dies with its engine
 * in M13; duplicating it until then is cheaper than a cross-boundary import.
 */
export const ctdlHostAllowlist: readonly string[] = [
	'credentialengineregistry.org',
	'sandbox.credentialengineregistry.org'
];

/**
 * Classify an `alignment.targetUrl` value:
 *
 * - `in-registry` — a URL whose host is in the CTDL allowlist.
 * - `off-allowlist` — a valid URL outside the allowlist (more blessed
 *   registries may be added later).
 * - `unparseable` — not a string, or not a URL at all.
 */
export function classifyTargetUrl(value: unknown): 'in-registry' | 'off-allowlist' | 'unparseable' {
	if (typeof value !== 'string') return 'unparseable';
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return 'unparseable';
	}
	return ctdlHostAllowlist.includes(url.host) ? 'in-registry' : 'off-allowlist';
}

/** A URL's host, or the raw value when it will not parse — for naming offenders in a message. */
export function safeHost(url: unknown): string {
	if (typeof url !== 'string') return String(url);
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}
