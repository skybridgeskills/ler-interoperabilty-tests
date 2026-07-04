import type { RequirementStatusView } from '$lib/components/interop/requirement-status-row/requirement-status-view.js';

import type { WalletActivityStatus } from '../test-wallet-types.js';

/**
 * Map a {@link WalletActivityStatus} onto the shared {@link RequirementStatusView}
 * vocabulary so the wallet activity list reuses the exact same tone source
 * (`runStatusToneClasses`) as `RunStatusIndicator` / `RequirementStatusRow` — the
 * two systems read as one and cannot drift. `info` is neutral (`n/a` tone).
 */
export function walletActivityStatusView(status: WalletActivityStatus): RequirementStatusView {
	switch (status) {
		case 'ok':
			return { tone: 'pass', label: 'OK' };
		case 'fail':
			return { tone: 'fail', label: 'FAIL' };
		case 'warn':
			return { tone: 'warn', label: 'WARN' };
		case 'skipped':
			return { tone: 'skipped', label: 'SKIPPED' };
		case 'info':
		default:
			return { tone: 'n/a', label: 'INFO' };
	}
}
