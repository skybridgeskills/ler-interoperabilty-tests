import type { ExchangeProtocolId } from '$lib/components/interop/exchange-runner/protocol-selector/index.js';
import type { ChecklistRunState, StepRunState } from '$lib/interop/index.js';

export type { ExchangeProtocolId };

/** Snapshot the panel renders. */
export type ExchangeRunnerPanelData = {
	run: ChecklistRunState;
	perStep: StepRunState[];
	/** VCALM `iu` interaction URL (always rendered when present). */
	interactionUrl?: string;
	/**
	 * OID4VCI 1.0 deep link (`openid-credential-offer://…`). Present only
	 * when the connected service supports OID4VCI; absent for legacy
	 * containers — the protocol selector hides itself in that case.
	 */
	oid4vciDeepLink?: string;
	/** Which protocol the right column is currently rendering. Defaults to `'vcalm'`. */
	selectedProtocol?: ExchangeProtocolId;
	exchangeId?: string;
	error?: { message: string; hint?: string };
};

export type ExchangeRunnerActions = {
	onInitiate: () => void | Promise<void>;
	onRetry?: () => void | Promise<void>;
	onReset?: () => void | Promise<void>;
	onSelectProtocol?: (next: ExchangeProtocolId) => void;
};
