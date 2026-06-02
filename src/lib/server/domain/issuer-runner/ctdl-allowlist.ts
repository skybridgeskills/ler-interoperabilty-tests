/**
 * Hosts recognized as CTDL Credential Registry deployments. Extensible
 * — add new blessed hosts (CASS / CASE / regional registries) here
 * without touching call sites.
 */
export const ctdlHostAllowlist: readonly string[] = [
	'credentialengineregistry.org',
	'sandbox.credentialengineregistry.org'
];

/**
 * Classify an `alignment.targetUrl` value:
 *
 * - `pass` — URL with a host in the CTDL allowlist.
 * - `warn` — URL with a host outside the allowlist (additional
 *   blessed registries may be added later).
 * - `fail` — value is not a string or does not parse as a URL.
 */
export function classifyTargetUrl(value: unknown): 'pass' | 'warn' | 'fail' {
	if (typeof value !== 'string') return 'fail';
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return 'fail';
	}
	return ctdlHostAllowlist.includes(url.host) ? 'pass' : 'warn';
}
