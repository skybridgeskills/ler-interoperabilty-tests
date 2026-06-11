import type { ChecklistRunState, StepRunState } from '$lib/interop/index.js';

/**
 * Protocol identifier used by the page to select which single link + header
 * label a runner presents. Lowercase JS-style identifier; the wire field on
 * the protocols object is uppercase (`OID4VCI`), handled at the page boundary.
 */
export type ExchangeProtocolId = 'vcalm' | 'oid4vci';

/** Snapshot the panel renders. Each runner presents exactly one protocol. */
export type ExchangeRunnerPanelData = {
	run: ChecklistRunState;
	perStep: StepRunState[];
	/** The single protocol link to present (VCALM `iu` OR the OID4VCI deep link). */
	interactionUrl?: string;
	/** Header label for the QR card, e.g. `'Live · interaction URL'` or `'Live · OID4VCI offer'`. */
	headerLabel?: string;
	exchangeId?: string;
	error?: { message: string; hint?: string };
};

export type ExchangeRunnerActions = {
	onInitiate: () => void | Promise<void>;
	onRetry?: () => void | Promise<void>;
	onReset?: () => void | Promise<void>;
};
