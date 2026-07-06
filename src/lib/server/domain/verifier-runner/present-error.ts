/**
 * Malformed present input (an unparseable/unresolvable request or interaction
 * URL) — surfaced as a 400 by the live-delivery present routes (OID4VP, VCALM).
 * A verifier that merely responds badly is evidence, not this error.
 */
export class PresentInputError extends Error {}
