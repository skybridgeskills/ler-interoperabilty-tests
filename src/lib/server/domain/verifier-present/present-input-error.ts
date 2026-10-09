/**
 * The operator's pasted interaction input could not be engaged at all — a blank
 * or non-URL value. Surfaced as a 400 by the present route.
 *
 * A verifier that merely responds badly is **evidence** (`submitted: false`),
 * never this error. This is only for input the suite cannot even attempt.
 */
export class PresentInputError extends Error {}
