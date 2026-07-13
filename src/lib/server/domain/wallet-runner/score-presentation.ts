import type { ProfileSlug } from '$lib/interop/profile-schema.js';

import { walletCheckRegistry } from './checks/index.js';
import { ExchangeChecker, type WalletReport } from './exchange-checker.js';
import { verifyExchangeContext } from './verify-exchange-context.js';
import type { WalletCheckFn, WalletExchangeView } from './wallet-check.js';

/** Outcome of scoring an observed verify (presentation) exchange. */
export type PresentScoreOutcome =
	| { settled: false; state: WalletExchangeView['state'] }
	| {
			settled: true;
			state: 'complete' | 'invalid';
			report: WalletReport;
			failingMustCount: number;
	  };

/** A settled verify exchange has reached an authoritative verdict. */
const SETTLED: ReadonlySet<WalletExchangeView['state']> = new Set(['complete', 'invalid']);

/**
 * Score a REAL operator wallet's credential-presentation from an observed verify
 * exchange. Guards for un-settled exchanges (returns `settled: false` so the page
 * keeps polling, never a spurious fail), then builds a black-box
 * {@link WalletCheckCtx} from the echoed VP and runs the wallet
 * `credential-presentation` checklist (+ the DI-cryptosuites additive) for `profile`.
 *
 * The registry is injectable for tests; production uses {@link walletCheckRegistry}.
 */
export function scorePresentation(
	input: { exchange: WalletExchangeView; profile: ProfileSlug },
	registry: Record<string, WalletCheckFn> = walletCheckRegistry
): PresentScoreOutcome {
	const { exchange, profile } = input;
	if (!SETTLED.has(exchange.state)) {
		return { settled: false, state: exchange.state };
	}

	const ctx = verifyExchangeContext(exchange, profile);
	const report = ExchangeChecker(registry).run({
		role: 'wallet',
		workflow: 'credential-presentation',
		profile,
		ctx
	});

	return {
		settled: true,
		state: exchange.state as 'complete' | 'invalid',
		report,
		failingMustCount: failingMustCountOf(report)
	};
}

/** Count MUST rows that resolved to `fail` — the graded failure signal. */
function failingMustCountOf(report: WalletReport): number {
	return report.groups
		.flatMap((g) => g.outcomes)
		.filter((o) => o.level === 'MUST' && o.status === 'fail').length;
}
