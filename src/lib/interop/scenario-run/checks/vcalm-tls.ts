import type { CheckResult } from '../automatic-checks.js';
import type { TlsSummary } from '../evidence.js';

/**
 * Score one host's TLS posture onto a floor check, ported 1:1 from the
 * verifier-runner `vcalm` floor (`tlsOutcome` in `vpr-checks.ts`): pass at TLS
 * 1.2 or above, fail below or undeterminable. There is no `n/a` for an automatic
 * outcome, so an unprobeable endpoint fails cleanly with the reason as detail.
 */
export function tlsCheckResult(tls: TlsSummary | undefined, endpointLabel: string): CheckResult {
	if (tls?.atLeastTls12) {
		return { met: true, detail: `The ${endpointLabel} negotiated ${tls.protocol ?? 'TLS 1.2+'}.` };
	}
	const reason =
		tls?.error ??
		(tls?.protocol
			? `it negotiated ${tls.protocol}, below TLS 1.2`
			: 'the TLS version could not be determined');
	return { met: false, detail: `The ${endpointLabel} did not meet TLS 1.2: ${reason}` };
}
