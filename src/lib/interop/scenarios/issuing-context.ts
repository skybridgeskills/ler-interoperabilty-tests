/**
 * Why a deployment cannot serve a scenario's pinned `(cryptosuite, didMethod)`.
 *
 * The type lives here, client-side, because it is **scenario vocabulary**: the
 * UI renders it as a disabled row's explanation, and the completion evaluation
 * reads it. Only the *resolution* — comparing an intent against what this
 * deployment's tenant advertises — is server work, and that lives in
 * `server/domain/scenario-runner/resolve-issuing-context.ts`.
 *
 * A typed reason rather than a message, because the consequence is arithmetic,
 * not just copy: a blocked scenario **keeps its requirements in the completion
 * denominator**. A shrinking denominator would let two deployments issue badges
 * that look identical and mean different things, so the badge is blocked
 * instead of quietly made easier to earn.
 */
export type CannotServe =
	| { kind: 'cryptosuite-unavailable'; requested: string; available: string[] }
	| { kind: 'did-method-unavailable'; requested: string; available: string[] };

/** Human-readable form, for API bodies and disabled-state copy. */
export function cannotServeMessage(reason: CannotServe): string {
	const axis = reason.kind === 'cryptosuite-unavailable' ? 'cryptosuite' : 'DID method';
	return `This deployment cannot issue with ${axis} "${reason.requested}". It serves: ${reason.available.join(', ')}.`;
}
