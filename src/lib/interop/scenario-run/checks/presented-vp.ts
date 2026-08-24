/**
 * Shared readers for the verifiable presentation an operator's wallet sent to a
 * `request-presentation` step.
 *
 * The suite is the **verifier** here, so — unlike `present-to-verifier` and
 * `receive-from-issuer`, which needed server leaves to project their outbound
 * observations — there is nothing to project. The transaction service folds
 * `verifier-core`'s `VerificationResult` into `variables.results.default`, and
 * `GET /api/exchange-runner/[exchangeId]` already returns the whole exchange to
 * the client. The evidence **is** the exchange record.
 *
 * Ported from `server/domain/wallet-runner/verify-exchange-context.ts`, which
 * stays standing until M13. Copied rather than imported: nothing under
 * `interop/` may reach into `$lib/server/`, and `runner-state.ts` is the worked
 * example of redeclaring the small shape you need instead.
 *
 * These readers **read**; they never score, and none of them throws. A partial
 * exchange is a normal state — a wallet that never answered leaves
 * `results.default` absent — so every hop narrows and gives back `undefined`.
 */

import { exchangeForStep, type RunEvidence } from '../evidence.js';

/**
 * The folded `verifier-core` result the transaction service exposes at
 * `variables.results.default`. Only the two fields the black-box checks read
 * are modelled; everything else on it is passthrough.
 */
export type VerificationResultView = {
	verified?: boolean;
	verifiablePresentation?: unknown;
};

/** What the OID4VP transport records under `variables.oid4vp`, as far as we read it. */
export type Oid4vpStateView = {
	responseReceived?: boolean;
	clientId?: unknown;
};

/** `variables.results.default`, or `undefined` when the exchange has not produced one. */
export function verificationResultFor(
	evidence: RunEvidence,
	stepId: string
): VerificationResultView | undefined {
	const results = exchangeForStep(evidence, stepId)?.variables?.results;
	if (!results || typeof results !== 'object') return undefined;
	const settled = (results as { default?: unknown }).default;
	return settled && typeof settled === 'object' ? (settled as VerificationResultView) : undefined;
}

/**
 * The presentation the operator's wallet sent, or `undefined`.
 *
 * A compact-JWT VP arrives as a **string**, which is a real answer and not an
 * absence — `wallet-vp-di-not-jwt` fails on exactly that — so this returns
 * whatever was echoed and lets each check narrow.
 */
export function presentedVpFor(evidence: RunEvidence, stepId: string): unknown {
	return verificationResultFor(evidence, stepId)?.verifiablePresentation;
}

/** `verifier-core`'s own verdict on the presentation. */
export function presentationVerifiedFor(evidence: RunEvidence, stepId: string): boolean {
	return verificationResultFor(evidence, stepId)?.verified === true;
}

/** `variables.oid4vp`, present only on an OID4VP exchange. */
export function oid4vpStateFor(evidence: RunEvidence, stepId: string): Oid4vpStateView | undefined {
	const state = exchangeForStep(evidence, stepId)?.variables?.oid4vp;
	return state && typeof state === 'object' ? (state as Oid4vpStateView) : undefined;
}

/**
 * The `client_id` / `domain` the verifier bound the presentation to, when the
 * exchange echoes one. Absent is normal, and `wallet-vp-proof-binding` falls
 * back to verifier-core's verdict rather than failing on it.
 */
export function requestDomainFor(evidence: RunEvidence, stepId: string): string | undefined {
	const variables = exchangeForStep(evidence, stepId)?.variables;
	const candidate =
		oid4vpStateFor(evidence, stepId)?.clientId ?? variables?.clientId ?? variables?.domain;
	return typeof candidate === 'string' ? candidate : undefined;
}

/** The VP's Data Integrity `proof` — the first, when the VP carries several. */
export function vpProofOf(presentation: unknown): Record<string, unknown> | undefined {
	const proof = (presentation as { proof?: unknown })?.proof;
	const first: unknown = Array.isArray(proof) ? proof[0] : proof;
	return first && typeof first === 'object' ? (first as Record<string, unknown>) : undefined;
}

/** `vp.proof.cryptosuite`, when it is a string. */
export function vpCryptosuiteOf(presentation: unknown): string | undefined {
	const suite = vpProofOf(presentation)?.cryptosuite;
	return typeof suite === 'string' ? suite : undefined;
}

/** `vp.holder`, tolerating both the bare-string and the `{ id }` object forms. */
export function vpHolderDidOf(presentation: unknown): string | undefined {
	const holder = (presentation as { holder?: unknown })?.holder;
	if (typeof holder === 'string') return holder;
	if (holder && typeof holder === 'object') {
		const id = (holder as { id?: unknown }).id;
		return typeof id === 'string' ? id : undefined;
	}
	return undefined;
}

/** The first embedded credential (`verifiableCredential`, single or array). */
export function embeddedCredentialOf(presentation: unknown): unknown {
	const credential = (presentation as { verifiableCredential?: unknown })?.verifiableCredential;
	return Array.isArray(credential) ? credential[0] : credential;
}

/**
 * The detail every check gives when no presentation was observed.
 *
 * This resolves to a **fail**, not to the engine's old `n/a`. The step's whole
 * job was to elicit a presentation; a green row beside a missing one misreads.
 */
export const NO_PRESENTATION = 'No verifiable presentation was observed on the exchange.';
