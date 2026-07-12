import type { ChecklistRunState, StepRunState } from '$lib/interop/index.js';

/**
 * Protocol identifier used by the page to select which single link a runner
 * presents; the panel maps it to a header label. Lowercase JS-style
 * identifier — the wire field on the protocols object is uppercase
 * (`OID4VCI`/`OID4VP`), handled at the page boundary.
 */
export type ExchangeProtocolId = 'vcalm' | 'oid4vci' | 'oid4vp';

/**
 * Snapshot the panel renders. The panel owns ALL copy: it derives the idle
 * heading/body, the complete-state body, and the QR header label from
 * `intent` + `protocol`, so call sites never pass copy strings. Each runner
 * presents exactly one protocol.
 */
export type ExchangeRunnerPanelData = {
	/** Whether this runner issues to (`issuance`) or verifies from (`verification`) the wallet. */
	intent: 'issuance' | 'verification';
	/** The single protocol this runner drives; selects the QR header label. */
	protocol: ExchangeProtocolId;
	run: ChecklistRunState;
	perStep: StepRunState[];
	/** The single protocol link to present (VCALM `iu`, the OID4VCI offer, or the OID4VP request). */
	interactionUrl?: string;
	exchangeId?: string;
	error?: { message: string; hint?: string };
};

export type ExchangeRunnerActions = {
	onInitiate: () => void | Promise<void>;
	onRetry?: () => void | Promise<void>;
	onReset?: () => void | Promise<void>;
};
