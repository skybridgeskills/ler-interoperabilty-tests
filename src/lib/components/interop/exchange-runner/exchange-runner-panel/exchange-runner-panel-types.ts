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

/**
 * What the panel is allowed to do. Every field is optional because attach mode
 * passes none of them: a page showing an exchange minted outside the suite must
 * offer no path to minting, and a button that silently does nothing is worse
 * than an absent one. With no `onInitiate` the panel replaces the idle CTA with
 * an explanation of why, rather than rendering a dead control.
 */
export type ExchangeRunnerActions = {
	/** Mint a fresh exchange. Omitted in attach mode. */
	onInitiate?: () => void | Promise<void>;
	/** Mint again after a failure. Falls back to `onInitiate`; omitted in attach mode. */
	onRetry?: () => void | Promise<void>;
	/** Clear back to idle after a completed run. Omitted in attach mode — see above. */
	onReset?: () => void | Promise<void>;
};
