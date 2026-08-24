/**
 * The operator's pasted interaction input could not be engaged at all — a blank
 * or non-URL value. Surfaced as a 400 by the present route.
 *
 * A verifier that merely responds badly is **evidence** (`submitted: false`),
 * never this error. This is only for input the suite cannot even attempt.
 *
 * Deliberately independent of `verifier-runner`'s same-named error: this shared
 * module is a leaf both `scenario-runner` and (later) OID4 can import without
 * pulling in the legacy verifier engine, which `verifier-runner` is retired into
 * scenario land phase by phase.
 */
export class PresentInputError extends Error {}
