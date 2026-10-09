import type { TlsSummary } from '$lib/interop/scenario-run/index.js';

import type { TlsProbeResult } from '../wallet-client/index.js';

/**
 * Collapse a TLS probe to the client-safe summary the checks read.
 *
 * A `TlsSummary` is **always present, never optional**: "we could not probe" is
 * `{ atLeastTls12: false, error }`, which is a fail. The automatic model has no
 * `n/a`, so an unprobed host must not read as an absence.
 */
export function summariseTls(
	tls: TlsProbeResult | undefined,
	whatWasNotProbed: string
): TlsSummary {
	if (!tls) return { atLeastTls12: false, error: whatWasNotProbed };
	return {
		atLeastTls12: tls.atLeastTls12,
		...(tls.protocol !== undefined ? { protocol: tls.protocol } : {}),
		...(tls.error !== undefined ? { error: tls.error } : {})
	};
}

/**
 * `credentialSubject.id` of a received credential, tolerating OB 3.0's array
 * form. Read here rather than in the check because the holder-binding check
 * compares it against the holder DID the *intake* authenticated with, which
 * only the leaf knows.
 */
export function subjectIdOf(credential: unknown): string | undefined {
	if (!credential || typeof credential !== 'object') return undefined;
	const subject = (credential as { credentialSubject?: unknown }).credentialSubject;
	const first: unknown = Array.isArray(subject) ? subject[0] : subject;
	if (!first || typeof first !== 'object') return undefined;
	const id = (first as { id?: unknown }).id;
	return typeof id === 'string' ? id : undefined;
}
